/**
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

 * @author Thanh Trung, Omorhefere Imoloame and Mahesha Kulatunga
 * @version 1.0.0
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
    // Create "tweet" and "query" tables if they are not already existed
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

    // Process submitted search form
    $("#form").on("submit", function(e) {
      e.preventDefault();

      // Construct query
      var basicKW = 'transfer OR buy OR bid OR moving OR move';
      var query = basicKW;
      var queryOption = $('input[id=queryOption]:checked').val();
      var fromOption = $('input[id=fromOption]:checked').val();
      var player = $('#playerName').val();
      var team = $('#teamName').val();
      var author = $('#authorName').val();
      // Add player to query
      if (player.length !== 0) {
          query = query + ' AND ' + splitQuery(player);
      }
      // Add player to query
      if (team.length !== 0) {
          query = query + ' ' + queryOption +  ' ' + splitQuery(team);
      }
      // Add author to query
      if (author.length !== 0) {
          author = author.replace(/@/g, "")
          query = query + ' ' + fromOption + ' from:' + author; // add author to query
      }

      // Find the number of local tweets from the given query
      myDB.transaction(function(tx) {
        var temp = {query_id: 0};
        tx.executeSql("SELECT * FROM query WHERE query_text = '" + query + "'", [], function(tx, rs) {
          if (rs.rows.length !== 0) {
            temp = rs.rows.item(0);
          }
          myDB.transaction(function(tx) {
            tx.executeSql("SELECT * FROM tweet WHERE query_id =" + temp.query_id + ";", [], function(tx, rs1) {
              console.log(rs1.rows.length);
              var localTweets = rs1.rows.length;

              // Ajax POST request to an API end point in web server
              $.ajax({
                url: "http://192.168.0.49:3000/api/search",
                data: {
                  player: player,
                  queryOption: queryOption,
                  fromOption: fromOption,
                  team: team,
                  author: author,
                  localTweets: localTweets
                },
                method: "POST",
                dataType: 'json',

                success: function(data) {
                  if (data.isFound === true) {
                    console.log(data);
                    // // Save or update query in local DB
                    var query_id = data.query_id;
                    if (rs.rows.length === 0) { // new query = save to local DB
                      myDB.transaction(function(tx) {
                        var i = [data.query_id, query, player, team, author];
                        tx.executeSql("INSERT INTO query (query_id, query_text, player_name, team, author) VALUES (?, ?, ?, ?, ?);", i);
                      }, function(error) {
                        console.log('Transaction ERROR: ' + error.message);
                      }, function(tx) {
                        console.log('Added <' + query + '> to local database');
                      });
                    } else { // query already existed = update created_at value
                      myDB.transaction(function(tx) {
                        tx.executeSql("UPDATE query SET created_at = date('now') WHERE query_id = " + query_id + ";");
                      }, function(error) {
                        console.log('Transaction ERROR: ' + error.message);
                      }, function(tx) {
                        console.log('Updated <' + query + '>');
                      });
                    }

                    // Save tweets to local DB
                    if (data.tweets.length !== 0) { // If there are new tweets from the API, save them first then tweets from remote DB are next
                      myDB.transaction(function(tx) {
                        var tArray = [];
                        var binding = "(?,?,?,?,?)";
                        data.tweets.forEach(function(tweet, index, array) {
                          var tweet_id = tweet.id_str; // tweet id
                          var tweet_text = tweet.text // tweet text
                          var username = tweet.user.screen_name // screen name of user who tweeted it
                          var created_at = new Date(tweet.created_at) // when user tweeted it
                          tArray.push(tweet_id, tweet_text, username, created_at, query_id);
                          if (index < data.tweets.length - 1) {
                            binding += ",(?,?,?,?,?)";
                          }
                        });
                        tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + binding + ";", tArray);
                      }, function(error) {
                        console.log('Transaction ERROR: ' + error.message);
                      }, function(tx) {
                        console.log('Added ' + data.tweets.length + ' tweets to local database');
                        // Add remoteTweets to local DB
                        if (data.remoteTweets.length !== 0) {
                          myDB.transaction(function(tx) {
                            var rBinding = "";
                            var rArray = [];
                            data.remoteTweets.forEach(function(tweet, index, array) {
                              rBinding += "(?,?,?,?,?)";
                              var tweet_id = tweet.tweet_id; // tweet id
                              var tweet_text = tweet.tweet_text // tweet text
                              var username = tweet.username // screen name of user who tweeted it
                              var created_at = new Date(tweet.created_at) // when user tweeted it
                              rArray.push(tweet_id, tweet_text, username, created_at, query_id);

                              // Bulk insert in Sqlite limit at 900. More info: https://github.com/litehelpers/Cordova-sqlite-storage/issues/282
                              if (rArray.length == 900) {
                                tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + rBinding + ";", rArray);
                                // Reset parameters
                                rArray = [];
                                rBinding = "";
                              } else {
                                rBinding += ",";
                              }
                            });

                            // Send the rest
                            if (rBinding !== "") {
                              tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + rBinding.slice(0, -1) + ";", rArray);
                            }
                          }, function(error) {
                            console.log('Transaction ERROR: ' + error.message);
                          }, function(tx) {
                            console.log('Added ' + data.remoteTweets.length + ' remote tweets to local database');
                          });
                        }
                      });
                    } else { // else, save only tweets from the remote DB
                      // Add remoteTweets to local DB
                      if (data.remoteTweets.length !== 0) {
                        myDB.transaction(function(tx) {
                          var rBinding = "";
                          var rArray = [];
                          data.remoteTweets.forEach(function(tweet, index, array) {
                            rBinding += "(?,?,?,?,?)";
                            var tweet_id = tweet.tweet_id; // tweet id
                            var tweet_text = tweet.tweet_text // tweet text
                            var username = tweet.username // screen name of user who tweeted it
                            var created_at = new Date(tweet.created_at) // when user tweeted it
                            rArray.push(tweet_id, tweet_text, username, created_at, query_id);

                            // Bulk insert in Sqlite limit at 900. More info: https://github.com/litehelpers/Cordova-sqlite-storage/issues/282
                            if (rArray.length == 900) {
                              tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + rBinding + ";", rArray);
                              // Reset parameters
                              rArray = [];
                              rBinding = "";
                            } else {
                              rBinding += ",";
                            }
                          });

                          // Send the rest
                          if (rBinding !== "") {
                            tx.executeSql("INSERT INTO tweet (tweet_id, tweet_text, username, created_at, query_id) VALUES " + rBinding.slice(0, -1) + ";", rArray);
                          }
                        }, function(error) {
                          console.log('Transaction ERROR: ' + error.message);
                        }, function(tx) {
                          console.log('Added ' + data.remoteTweets.length + ' remote tweets to local database');
                        });
                      }
                    }

                    // Display new tweets from the Twitter API
                    $("#tweetsPanel").attr("hidden", null);
                    document.getElementById('tweetsResult').innerHTML = '';
                    if (data.tweets.length !== 0) {
                      tweetsArray = data.tweets;
                      $("#tweetsResult").append('<button style="display: block; margin-bottom: 20px; margin-top: 20px;" class="btn btn-primary search-button" id="btnToggle" role="button" data-toggle="collapse" data-target="#apiTweets" aria-expanded="false" aria-controls="apiTweets">Show ' + tweetsArray.length + ' new tweets from API <span class="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span></button>');
                      $("#tweetsResult").append('<div class="collapse" id="apiTweets"></div>');
                        for (t = 0 ; t < tweetsArray.length ; t++) {
                        var created_at = new Date(tweetsArray[t].created_at);
                        var dateString = formatDate(created_at.getUTCDate()) + '-' + formatDate(created_at.getUTCMonth()) + '-' + created_at.getUTCFullYear() + ' ' + formatDate(created_at.getUTCHours()) + ':' + formatDate(created_at.getUTCMinutes());

                        // $("#tweetsResult").append('<div class="tweet-container"><div class="tweet-box"><div class="tweet-heading"><a href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '" target="_blank">@' + tweetsArray[t].user.screen_name + '</a></div></div></div>');
                        // $("#tweetsResult").append('<a class="tweet-text" href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '/status/' + tweetsArray[t].id_str + '" target="_blank"><div class="tweet-link-div">' + tweetsArray[t].text + '</div></a>');
                        // $("#tweetsResult").append('<div class="tweet-footer"><p> Time and date: ' + created_at + ' </p></div>');

                        $("#apiTweets").append('<div class="panel panel-default panel-tweet"> \
                                              <div class="panel-heading"><a href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '" target="_blank">@' + tweetsArray[t].user.screen_name + '</a></div> \
                                              <div class="panel-body"><a class="tweet-text" href="https://www.twitter.com/' + tweetsArray[t].user.screen_name + '/status/' + tweetsArray[t].id_str + '" target="_blank">' + tweetsArray[t].text + '</a></div> \
                                              <div class="panel-footer">Time and date: ' + dateString + '</div> </div>');
                      }
                    } else {
                      $("#tweetsResult").append('<button style="display: block; margin-bottom: 20px; margin-top: 20px;" class="btn btn-primary search-button" disabled>There is 0 new tweet from API <span class="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span></button>');
                    }

                    // Display last 100 tweets from the DB
                    if (data.dbTweets) {
                      dbTweetsArray = data.dbTweets;
                      $("#tweetsResult").append('<button style="display: block; margin-bottom: 20px;" class="btn btn-primary search-button" id="btnToggle" role="button" data-toggle="collapse" data-target="#dbTweets" aria-expanded="false" aria-controls="dbTweets">Show last 100 tweets from the database <span class="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span></button>');
                      $("#tweetsResult").append('<div class="collapse" id="dbTweets"></div>');
                      for (t = 0 ; t < dbTweetsArray.length ; t++) {
                        var created_at = new Date(dbTweetsArray[t].created_at);
                        var dateString = formatDate(created_at.getUTCDate()) + '-' + formatDate(created_at.getUTCMonth()) + '-' + created_at.getUTCFullYear() + ' ' + formatDate(created_at.getUTCHours()) + ':' + formatDate(created_at.getUTCMinutes());
                        // $("#tweetsResult").append('<div class="tweet-container"><div class="tweet-box"><div class="tweet-heading"><a href="https://www.twitter.com/' + dbTweetsArray[t].username + '" target="_blank">@' + dbTweetsArray[t].username + '</a></div></div></div>');
                        // $("#tweetsResult").append('<a class="tweet-text" href="https://www.twitter.com/' + dbTweetsArray[t].username + '/status/' + dbTweetsArray[t].tweet_id + '" target="_blank"><div class="tweet-link-div">' + dbTweetsArray[t].tweet_text + '</div></a>');
                        // $("#tweetsResult").append('<div class="tweet-footer"><p> Time and date: ' + created_at + ' </p></div>');

                        $("#dbTweets").append('<div class="panel panel-default panel-tweet"> \
                                              <div class="panel-heading"><a href="https://www.twitter.com/' + dbTweetsArray[t].username + '" target="_blank">@' + dbTweetsArray[t].username + '</a></div> \
                                              <div class="panel-body"><a class="tweet-text" href="https://www.twitter.com/' + dbTweetsArray[t].username + '/status/' + dbTweetsArray[t].tweet_id + '" target="_blank">' + dbTweetsArray[t].tweet_text + '</a></div> \
                                              <div class="panel-footer">Time and date: ' + dateString + '</div> </div>');
                      }
                    }

                    // Show the graph
                    showGraph(data);
                    // Show the dbPedia info
                    showDBPInfo(data);
                  } else {
                    $("#tweetsPanel").attr("hidden", null);
                    document.getElementById('tweetsResult').innerHTML = '';
                    $("#tweetsResult").append('<div class="alert alert-info" role="alert">No tweet found</div>');
                  }
                },
                fail: function(err) {
                  console.error(err);
                }
              });
            }, function(tx, error1) {
              console.log('Transaction ERROR: ' + error1.message);
            });
          });
        }, function(tx, error) {
          console.log('Transaction ERROR: ' + error.message);
        });
      });

    });


    $('#btnTest').on('click', function(e) {
      e.preventDefault();
      $.ajax({url: "http://192.168.0.49:3000/api/tweet", dataType: "json", method: "GET"}).done(function(data) {
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

/**
 * Contruct query from a given player/team query.
 * @param {string} queryString - Array of unique dates.
 * @return Arrays of classified tweets.
 */
function splitQuery(queryString) {
  var words = queryString.split(","); // split at comma
  var fullQuery = "";

  // Contruct query string
  for (var i = 0; i < words.length; i++) {
    if (i === words.length - 1) {
      fullQuery = fullQuery + words[i];
    } else {
      fullQuery = fullQuery + words[i] + " OR";
    }
  }
  return fullQuery;
}

/**
 * Format a given date-related string such as date, month, hour, minute
 * @param {integer} number - date/month/hour/minute
 * @return Formatted string
 */
function formatDate(number) {
  var x = number.toString();
  if (x.length === 1) {
    x = '0' + x;
  }
  return x;
}

/**
 * Display DBPedia info
 * @param {json} data - JSON data returned from the AJAX request
 */
function showDBPInfo(data) {
  if (data.DBpediaInfo !== undefined) {
    $("#dbtab").attr("hidden", null);
    document.getElementById('dbinfo').innerHTML = '';
    $("#dbinfo").append('<div class="col-xs-12"><h1 class="db-heading">' + data.DBpediaInfo.playerInfo[0].name + ' </h1><p> ' + data.DBpediaInfo.playerInfo[1].dob + ' <p><h3> ' + data.DBpediaInfo.playerInfo[2].team + '</h3><h4> ' + data.DBpediaInfo.playerInfo[3].position + '</h4></div>');
    console.log("passed append bit")

  } else {
    $("#dbtab").attr("hidden", true);
    document.getElementById('dbinfo').innerHTML = '';
  }
}

/**
 * Display graph via Chartjs
 * @param {json} data - JSON data returned from the AJAX request
 */
function showGraph(data) {
  $("#graphtab").attr("hidden", null);
  var dates = [];
  var freqs = [];

  for (group = 0 ; group < data.classifiedTweets.length ; group++) {
    var date = new Date(data.classifiedTweets[group][0].created_at).toDateString();
    var freq = data.classifiedTweets[group].length;
    dates.push(date);
    freqs.push(freq);
  }
  var ctx = document.getElementById('freqGraph').getContext('2d');
  var freqGraph = new Chart(ctx, {
    type: 'line',
    responsive: true,
    data: {
      labels: dates.reverse(),
      datasets: [{
        label: 'Number of Tweets',
        data: freqs,
        backgroundColor: "rgba(153,255,51,0.4)"
      }]
    }
  });
}


var myDB;
app.initialize();
