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

        $("#form").on("submit", function(e) {
          e.preventDefault();
          myDB.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS query (query_id INTERGER(11) PRIMARY KEY UNIQUE NOT NULL ,\
             query_text VARCHAR(100) NOT NULL,\
              player_name VARCHAR(50) DEFAULT NULL,\
              team VARCHAR(25) DEFAULT NULL,\
              author VARCHAR(20) DEFAULT NULL,\
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
          }, function(error) {
            console.log('Transaction ERROR: ' + error.message);
          }, function(tx) {
            console.log('Populated database OK');
          });

          myDB.executeSql('SELECT * FROM query;', [], function(rs) {
            // console.log(rs);
            alert(rs);
          }, function(error) {
            console.log('Transaction ERROR: ' + error.message);
          });
        });

    }
};
var myDB;
app.initialize();
