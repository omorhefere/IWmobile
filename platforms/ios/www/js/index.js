/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        myDB = window.sqlitePlugin.openDatabase({name: "iwmobile.db", location: 'default'});
        myDB.transaction(function(tx) {
          tx.executeSql('CREATE TABLE IF NOT EXISTS query (query_id INTERGER(11) PRIMARY KEY UNIQUE NOT NULL ,\
            query_text VARCHAR(200) NOT NULL,\
            player_name VARCHAR(100) DEFAULT NULL,\
            team VARCHAR(100) DEFAULT NULL,\
            author VARCHAR(20) DEFAULT NULL,\
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
          tx.executeSql('CREATE TABLE IF NOT EXISTS tweet (tweet_id VARCHAR(30) PRIMARY KEY UNIQUE NOT NULL ,\
            tweet_text TEXT NOT NULL,\
            username VARCHAR(20) NOT NULL,\
            created_at DATETIME NOT NULL,\
            retrieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\
            query_id INTERGER(11), \
            FOREIGN KEY(query_id) REFERENCES query (query_id))');
        }, function(error) {
          console.log('Transaction ERROR: ' + error.message);
        }, function(tx) {
          console.log('Populated database OK');
        });

        $("#form").on("submit", function(e) {
          console.log('form sent')
          e.preventDefault();
          $.ajax({
            url: "http://127.0.0.1:3000/api/search?" + $(this).serialize(),
            dataType: "json",
            method: "GET",
          })
          .done(function(data) {
            // Display tweets
            var tweets = "";
            var tweetsArray = [];
            var query_id = data.query_id;
            data.tweets.forEach(function(tweet, index, array) {
              var string = "<li>" + tweet.text + "</li>";
              tweets = tweets + string;

              var tweet_id = tweet.id_str; // tweet id
              var tweet_text = tweet.text // tweet text
              var username = tweet.user.screen_name // screen name of user who tweeted it
              var created_at = new Date(tweet.created_at) // when user tweeted it
              var retrieved_at = Date.now();
              // var tweetArray = [tweet_id, tweet_text, username, created_at, query_id];
              tweetsArray.push(tweet_id, tweet_text, username, created_at, retrieved_at, query_id);
            });
            console.log(tweetsArray);
            $("#tweetsPanel").attr("hidden", null);
            $("#tweetsResult").append("<ul>" + tweets + "</ul>");
            // Save tweets to local DB
            myDB.transaction(function(tx) {
              tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, retrieved_at, query_id) VALUES (?,?,?,?,?,?)", tweetsArray);
            }, function(error) {
              console.log('Transaction ERROR: ' + error.message);
            }, function(tx) {
              console.log('Added' + tweetsArray.length + 'tweets to local database');
            });

          })
          .fail(function(err){
            console.error(err);
          });
        });

        $('#btnTest').on('click', function(e) {
          e.preventDefault();

          $.ajax({
            url: "http://127.0.0.1:3000/api/tweet",
            dataType: "json",
            method: "GET",
          })
          .done(function(data) {
            alert(data.message);
            console.log(data);
          })
          .fail(function(err){
            console.error(err);
          });
        });

      $("#btnDrop").on("click", function(e) {
        e.preventDefault();

        var text = confirm("This will delete the \"query\" and  \"tweet\"  tables, are you sure ?");
        if (text === true) {
          myDB.transaction(function(tx) {
            tx.executeSql("DROP TABLE IF EXISTS query");
            tx.executeSql("DROP TABLE IF EXISTS tweet");
          }, function(error) {
            console.log('Transaction ERROR: ' + error.message);
          }, function(tx) {
            console.log('Successfully drop "query" and "tweet" tables');
          });
        }
      });
    }
};
var myDB;
app.initialize();
