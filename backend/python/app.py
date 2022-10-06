from flask import Flask, request
import json 
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
   
# Setup flask server
app = Flask(__name__) 

@app.route('/getplaylist', methods = ['GET'])
def getPlaylist():
    args = request.args
    playlist = args.get("playlist")
    # Function used to create OHE features for popularity and release year variables
    def ohe_prep(df, column, new_name): 
        tf_df = pd.get_dummies(df[column])
        feature_names = tf_df.columns
        tf_df.columns = [new_name + "|" + str(i) for i in feature_names]
        tf_df.reset_index(drop = True, inplace = True)    
        return tf_df

    # Function used to create feature set that will be used to generate its vector
    def create_feature_set(df, float_cols):
        tfidf = TfidfVectorizer()
        genres_matrix =  tfidf.fit_transform(df['genres'].apply(lambda x: " ".join(x)))
        genre_df = pd.DataFrame(genres_matrix.toarray()) 
        genre_df.columns = ['genre' + "|" + i for i in tfidf.get_feature_names_out()]
        genre_df.reset_index(drop = True, inplace=True)
        
        genre_df = genre_df * .40
        year_ohe = ohe_prep(df, 'rls_year','year') * .20
        popularity_ohe = ohe_prep(df, 'popularity_red','pop') * 0.15
        
        #scale float columns
        floats = df[float_cols].reset_index(drop = True)
        scaler = MinMaxScaler()
        floats_scaled = pd.DataFrame(scaler.fit_transform(floats), columns = floats.columns) * 0.2

        #concanenate all features
        final = pd.concat([genre_df, floats_scaled, popularity_ohe, year_ohe], axis = 1)
        
        #add song id
        final['id']=df['id'].values
        
        return final

    # generate playlist vector
    def generate_playlist_feature_vector(feature_set_df):
        feature_set_df = feature_set_df.drop(columns='id')
        
        #sort column names
        feature_set_df = feature_set_df.reindex(sorted(feature_set_df.columns), axis=1)
        
        return feature_set_df.sum(axis = 0)

    input_playlist_df = pd.read_json("../data/%s" % playlist)
    input_playlist_df.columns = ['date_added','id', 'name', 'popularity', 'duration_ms', 'explicit', 'artists', 'genres', 'id_artists', 'release_date', 'danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'time_signature', 'album_cover', 'preview_url', 'track_url', 'track_uri']

    # parse artist column from string to list datatype
    input_playlist_df['artists_upd'] = input_playlist_df['artists'].apply(lambda x: str(x).split('-'))

    # extract release year into new column
    input_playlist_df['rls_year'] = input_playlist_df['release_date'].apply(lambda x: x.split('-')[0])

    # extract columns that have float values
    float_cols = input_playlist_df.dtypes[input_playlist_df.dtypes == 'float64'].index.values

    # create 5 point buckets for popularity 
    input_playlist_df['popularity_red'] = input_playlist_df['popularity'].apply(lambda x: int(x/5))

    input_playlist_df['rls_year'] = input_playlist_df['rls_year'].apply(lambda x: int(x))

    input_playlist_df['genres'] = input_playlist_df['genres'].tolist()

    with open('../data/shared_memory.json', 'r') as f:
        data = json.load(f)
    my_library_df = pd.DataFrame(data)
    my_library_df.columns = ['date_added','id', 'name', 'popularity', 'duration_ms', 'explicit', 'artists', 'genres', 'id_artists', 'release_date', 'danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'time_signature', 'album_cover', 'preview_url', 'track_url', 'track_uri']
    my_library_df

    # clean my library df
    # artists column is a string datatype. parse to a list
    my_library_df['artists_upd'] = my_library_df['artists'].apply(lambda x: str(x).split(','))

    my_library_df['artists_song'] = my_library_df.apply(lambda row: row['artists_upd'][0]+row['name'],axis = 1)
    my_library_df.drop_duplicates('artists_song',inplace = True)

    # extract release year from release date
    my_library_df['rls_year'] = my_library_df['release_date'].apply(lambda x: str(x).split('-')[0])

    # find what columns have float values
    float_cols = my_library_df.dtypes[my_library_df.dtypes == 'float64'].index.values

    my_library_df['genres'] = my_library_df['genres'].tolist()

    my_library_df['rls_year'] = my_library_df['rls_year'].apply(lambda x: int(x))

    # create 5 point buckets for popularity 
    my_library_df['popularity_red'] = my_library_df['popularity'].apply(lambda x: int(x/5))

    # create feature set of user songs
    my_library_feature_set_df = create_feature_set(my_library_df, float_cols)
    my_library_feature_set_df = my_library_feature_set_df.reindex(sorted(my_library_feature_set_df.columns), axis=1)

    # extract columns where columns intersect between the user songs feature set and input songs feature set
    my_library_complete_feature_set_template = my_library_feature_set_df.iloc[0:0]
    input_playlist_feature_set_df = create_feature_set(input_playlist_df, float_cols)
    intersection = list(my_library_complete_feature_set_template.columns.intersection(input_playlist_feature_set_df.columns))

    # synchronize column number and names
    merged_df = pd.merge(input_playlist_feature_set_df,my_library_complete_feature_set_template, how='left', on=intersection)
    merged_df.fillna(0,inplace=True)
    complete_feature_set_df = merged_df.reindex(sorted(merged_df.columns), axis=1)

    input_playlist_feature_set_df_template = input_playlist_feature_set_df.iloc[0:0]

    # synchronize column number and names pt. 2
    my_library_feature_set_df = pd.merge( input_playlist_feature_set_df_template, my_library_feature_set_df, how='right', on=intersection)
    my_library_feature_set_df.fillna(0,inplace=True)
    my_library_feature_set_df = my_library_feature_set_df.reindex(sorted(my_library_feature_set_df.columns), axis=1)

    complete_feature_set_vector = generate_playlist_feature_vector(complete_feature_set_df)

    # run cosine similarity between user list of songs and input playlist songs
    my_library_feature_set_df['sim'] = cosine_similarity(my_library_feature_set_df.drop('id', axis = 1).values, complete_feature_set_vector.values.reshape(1, -1))[:,0]
    my_library_match_top_50 = my_library_feature_set_df.sort_values(by='sim',ascending = False).head(30)
    my_library_match_top_50 = my_library_match_top_50.merge(my_library_df, on="id")

    # convert dataframe to JSON
    my_library_match_top_50 = my_library_match_top_50.to_json(orient="records")

    return my_library_match_top_50

   
if __name__ == "__main__": 
    app.run(port=5001)