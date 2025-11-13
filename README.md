# MAL-analytics

## Data set structures: (rough draft read)
### Anime.csv
#### Cleaning:
 - Converted dates to date-time, and appropriate ints to ints. 
 - Inappropriate / missing data should be handled correctly (ie, can just filter by Null theoretically), but missing data (empty string) may still be returned (check this rq yun!)
 - ^^ in theory this shouldn't happen though based on my research here: https://stackoverflow.com/questions/70481973/using-python-psycopg2-to-transfer-data-from-csv-to-postgresql-but-cant-figure
#### Structure:
everything is relatively self explanatory for now imo, maybe we can fill this out or delete it later. 
### Anime_anime.csv
#### Cleaning:
 - same as above, 
#### Structure:
Related: 
0 or 1 depending if animeB is a recommendation of animeA
##### To check! if it is true that in any row, at least one of related or recommended is 1 (since it should be like that to my understanding (why would it be here otherwise))

Relationship_type: 
    'Other' 'Sequel' 'Prequel' 'Summary' 'Identity' 'Spin-off' 'Character'
    'Full story' 'Side story' 'Parent story' 'Alternative setting'
    'Alternative version'

