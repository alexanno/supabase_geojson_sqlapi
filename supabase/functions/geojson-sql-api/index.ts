import { corsHeaders } from '../_shared/cors.ts'

import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { config } from 'https://deno.land/x/dotenv/mod.ts'

// Load environment variables from a .env file
config({ export: true })

// Create a database pool with one connection.
const pool = new Pool(
  {
    tls: { enabled: false },
    database: Deno.env.get('DB_DATABASE'),
    hostname: Deno.env.get('DB_HOSTNAME'),
    user: Deno.env.get('DB_USER'),
    port: Deno.env.get('DB_PORT'),
    password: Deno.env.get('DB_PASSWORD'),
  },
  1
)

Deno.serve(async (_req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the query parameter `q`
    const url = new URL(_req.url);
    const query = url.searchParams.get("q");

    if (!query) {
      return new Response("Missing query parameter 'q'", { status: 400 });
    }

    try {
      // Grab a connection from the pool
      const connection = await pool.connect()

      try {
        // Run a query
        const spquery = `SELECT execute_query('${query}')`
        const result = await connection.queryObject(spquery)
        const geojson = result.rows[0].execute_query // [{ id: 1, name: "Lion" }, ...]
        
        //get only the first row and column

        // Encode the result as pretty printed JSON
        const body = JSON.stringify(
          geojson,
          (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        )

        // Return the response with the correct content type header
        return new Response(body, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } finally {
        // Release the connection back into the pool
        connection.release()
      }
    } catch (err) {
      console.error(err)
      return new Response(String(err?.message ?? err), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      })
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response("Internal Server Error", { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
})