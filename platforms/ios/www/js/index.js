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
      tx.executeSql('CREATE TABLE IF NOT EXISTS query (query_id INTEGER PRIMARY KEY UNIQUE NOT NULL ,\
            query_text TEXT NOT NULL,\
            player_name TEXT DEFAULT NULL,\
            team TEXT DEFAULT NULL,\
            author TEXT DEFAULT NULL,\
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS tweet (id INTEGER PRIMARY KEY AUTOINCREMENT,\
            tweet_id TEXT NOT NULL,\
            tweet_text TEXT NOT NULL,\
            username TEXT NOT NULL,\
            created_at DATETIME NOT NULL,\
            retrieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\
            query_id INTEGER,\
            FOREIGN KEY(query_id) REFERENCES query (query_id))');
    }, function(error) {
      console.log('Transaction ERROR: ' + error.message);
    }, function(tx) {
      console.log('Populated database OK');
    });

    $("#form").on("submit", function(e) {
      e.preventDefault();
      var queryOption;

        $.ajax({
          url: "http://143.167.146.214:3000/api/search?" + $(this).serialize(),
          data: {
            player: $('#playerName').val(),
            queryOption: $('input[id=queryOption]:checked').val(),
            team: $('#teamName').val(),
            author: $('#authorName').val()
          },
          method: "POST",
          dataType: 'json',

          success: function(data) {
            // Display tweets
            var tweets = "";
            var tweetsArray = [];
            var query_id = data.query_id;
            var binding = "(?,?,?,?,?)";
            data.tweets.forEach(function(tweet, index, array) {
              var string = "<li>" + tweet.text + "</li>";
              tweets = tweets + string;

              var tweet_id = tweet.id_str; // tweet id
              var tweet_text = tweet.text // tweet text
              var username = tweet.user.screen_name // screen name of user who tweeted it
              var created_at = new Date(tweet.created_at) // when user tweeted it
              // var tweetArray = [tweet_id, tweet_text, username, created_at, query_id];
              //tweetsArray.push(tweet_id, tweet_text, username, created_at, query_id);
              if (index < data.tweets.length - 1) {
                binding += ",(?,?,?,?,?)";
              }
            });

            tweetsArray = data.tweets;
              $("#tweetsPanel").attr("hidden", null);
              var old_html = $("#tweetsResult").html();
              document.getElementById('tweetsResult').innerHTML = '';
              for (t = 0 ; t < tweetsArray.length ; t++){
                var created_at = tweetsArray[t].created_at ;
                //$("#tweetsResult").append("<ul> <li>" + tweetsArray[t].user.screen_name + "</li> </ul>");
                $("#tweetsResult").append('<div class="tweet-container"><div class="tweet-box"><div class="tweet-heading"><a href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '" target="_blank">@' + tweetsArray[t].user.screen_name + '</a></div></div></div>');
                $("#tweetsResult").append('<a class="tweet-text" href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '/status/' + tweetsArray[t].id_str + '" target="_blank"><div class="tweet-link-div">' + tweetsArray[t].text + '</div></a>');
                $("#tweetsResult").append('<div class="tweet-footer"><p> Time and date: ' + created_at + ' </p></div>');
              }

            dbTweetsArray = data.dbTweets;
              for (t = 0 ; t < dbTweetsArray.length ; t++){
                var created_at = dbTweetsArray[t].created_at ;
                //$("#tweetsResult").append("<ul> <li>" + tweetsArray[t].user.screen_name + "</li> </ul>");
                $("#tweetsResult").append('<div class="tweet-container"><div class="tweet-box"><div class="tweet-heading"><a href="https://www.twitter.com/' + dbTweetsArray[t].username + '" target="_blank">@' + dbTweetsArray[t].username + '</a></div></div></div>');
                $("#tweetsResult").append('<a class="tweet-text" href="https://www.twitter.com/' + dbTweetsArray[t].username + '/status/' + dbTweetsArray[t].tweet_id + '" target="_blank"><div class="tweet-link-div">' + dbTweetsArray[t].tweet_text + '</div></a>');
                $("#tweetsResult").append('<div class="tweet-footer"><p> Time and date: ' + created_at + ' </p></div>');
              }
            if (data.DBpediaInfo !== undefined){
              console.log(data.DBpediaInfo + "Got info")
              $("#dbtab").attr("hidden", null);
              var old_html = $("#dbinfo").html();
              document.getElementById('dbinfo').innerHTML = '';
              $("#dbinfo").append('<div class="col-xs-12"><h1 class="db-heading">' + data.DBpediaInfo.playerInfo[0].name + ' </h1><p> ' + data.DBpediaInfo.playerInfo[1].dob + ' <p><h3> ' + data.DBpediaInfo.playerInfo[2].team + '</h3><h4> ' + data.DBpediaInfo.playerInfo[3].position + '</h4></div>');
              console.log("passed append bit")

            }
            else{
              $("#dbtab").attr("hidden", true);
              var old_html = $("#dbinfo").html();
              document.getElementById('dbinfo').innerHTML = '';
            }


            //$("#tweetsPanel").attr("hidden", null);
            //$("#tweetsResult").append("<ul>" + tweets + "</ul>");
            // Save tweets to local DB
            // var test = [data.tweets[0].id_str, data.tweets[0].text, data.tweets[0].user.screen_name, new Date(data.tweets[0].created_at), query_id];
            // console.log(test);
            myDB.transaction(function(tx) {
              tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + binding + ";", tweetsArray);
            }, function(error) {
              console.log('Transaction ERROR: ' + error.message);
            }, function(tx) {
              console.log('Added' + data.tweets.length + 'tweets to local database');
            });

          },
          fail: function(err) {
            console.error(err);
          }
        })
    });

    $('#btnTest').on('click', function(e) {
      e.preventDefault();
      $.ajax({url: "http://143.167.146.214:3000/api/tweet", dataType: "json", method: "GET"}).done(function(data) {
        alert(data.message);
        console.log(data);
      }).fail(function(err) {
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
