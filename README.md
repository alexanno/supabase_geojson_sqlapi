# supabase_geojson_sqlapi
GeoJSON SQL API for Supabase. Makes a simple REST API to run arbitrary SELECT queries and return the result as valid GeoJSON. Code is developed for Supabase Edge Functions, but should easily be adaptable to any arbitrary language with a PostGIS server as backend.

Usage
```
https://www.host.com/geojson-sql-api?q=SELECT * from world_fires limit 1
```

Geometry column from query result must be named 'geom'. 

Returns:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          12.22745,
          -5.80677
        ]
      },
      "properties": {
        "ogc_fid": 1,
        "latitude": -5.80677,
        "longitude": 12.22745,
        "bright_ti4": 303.33,
        "scan": 0.32,
        "track": 0.55,
        "acq_date": "2022-12-03",
        "acq_time": "0000",
        "satellite": "1",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_ti5": 276.12,
        "frp": 0.3,
        "daynight": "N"
      }
    }
  ]
}
```

## Create a new project at Supabase

### SQL function for running queries
PL/PGSQL function to wrap the input query in a select query for some security measure. Also builds a valid GeoJSON FeatureCollection as the result. The return is a single row with one column. This could be optimized/adapted depending on the script/function for the REST API. 

```sql
CREATE OR REPLACE FUNCTION execute_query(query text)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
  EXECUTE format('
		SELECT json_build_object(
		    ''type'', ''FeatureCollection'',
		    ''features'', json_agg(ST_AsGeoJSON(t.*)::json)
		    )
		FROM (%s) as t
        ', query) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

--select execute_query('select * from kommuner limit 1');
```

## Add data using ogr2ogr

```sh
ogr2ogr -f "PostgreSQL" PG:"host=aws-123.supabase.com port=1234 dbname=postgres user=postgres.123321user password=1234pass" countries.geojson -nln countries -progress
```

## Add indexes
```sql
--example
create index idx_countries_geom on countries using GIST (geom);
```

## Create a new user with SELECT only
```sql
create role "geojson_sql_api_user" with login password 'fds&&&7em&';

-- Ensure the user has usage rights on the schema
GRANT USAGE ON SCHEMA public TO geojson_sql_api_user;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO geojson_sql_api_user;

```
**REMEMBER:** Add the hash after the username in the login like this:

```
geojson_sql_api_user.sbmbeeddiylrglcxgfws
```

## Install Supabase cli

```sh
supabase init
supabase functions new geojson-sql-api 
```

* Copy index.ts and modify at desire
* create a .env file with secrets

## Deploy function with .env file:

```sh
supabase functions deploy --no-verify-jwt geojson-sql-api
supabase secrets set --env-file supabase/functions/geojson-sql-api/.env
```

## Test API
```
https://sdffdsjkljkl.supabase.co/functions/v1/geojson-sql-api?q=SELECT * from countries limit 10
```


## References
* Inspired by: https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/postgres-on-the-edge