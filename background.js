var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
createDatabase();

var a = new Audio();
var musics;
var shuffle_history = [];

    
var index_playlist = 0;
chrome.storage.local.get("index_playlist", function(res) {
    if(res && res.index_playlist) {
        index_playlist = res.index_playlist;
    }
});
var volume = 1;
chrome.storage.local.get("volume", function(res) {
    if(res && res.volume) {
        volume = res.volume;
    }
});

chrome.runtime.onStartup.addListener(launch);

async function launch() {
    musics = await getPlaylist("default");
    if(musics) {
        chrome.storage.local.get("play", function(res) {
            if (res && res.play) {
                initializeAudio(musics[0]);
            }
        });
    } else {
        console.log("No playlist found!");
    }
}

// Detect audible chrome tabs
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if(changeInfo.audible == true) {
        a.pause();
        console.log("Pause audio");
    } else if(changeInfo.audible == false) {
        chrome.storage.local.get("play", function(res) {
            if (res && res.play) {
                a.play();
                console.log("Play audio");
            }
        });
    }
});

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    console.log("New command : " + request.command);
    switch(request.command) {
        case "upload":
            var musics_serialized = request.value;
            var musics_deserialized = musics_serialized.map(deserialize);
            
            if(await getPlaylist("default")) {
                console.log("Playlist found!");
                addSongs("default", musics_deserialized);
            } else {
                console.log("Playlist not found!");
                addPlaylist("default", musics_deserialized);
            }

            musics = await getPlaylist("default");
            
            initializeAudio(musics[0]);
            break;
        
    case "play":
        chrome.storage.local.set({play: true, function() {
            console.log("Statement saved!");
        }})
        
        if(a && musics){
            a.play();
            console.log("Music playing!");
        } else {
            launch();
        }
        break;

    case "pause":
        chrome.storage.local.set({play: false, function() {
            console.log("Statement saved!");
        }})
        
        if(a){
            a.pause();
            console.log("Music paused!");
        }
        break;
    
    case "next":
        if(!musics){
            musics = await getPlaylist("default");
        }
        changeIndexPlaylist(1);
        initializeAudio(musics[index_playlist]);
        break;

    case "previous":
        if(!musics){
            musics = await getPlaylist("default");
        }
        changeIndexPlaylist(-1);
        initializeAudio(musics[index_playlist]);
        break;

    case "reset":
        deletePlaylist("default");
        break;
    case "volume":
        volume = request.value;
        chrome.storage.local.set({volume: volume});
        a.volume = volume;
        break;
    }

    sendResponse("Alright !");
});

function deserialize(src) {
    const { type, name, lastModified } = src;
    
    const binStr = atob(src.value);
    const arr = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
    const data = [arr.buffer];
    
    return new File(data, name, {type, lastModified})
}

function initializeAudio(src) {
    console.log("initializeAudio");
    a.src = URL.createObjectURL(src);
    a.play();
    a.addEventListener('ended', function() {
        console.log("Music ended!");
        changeIndexPlaylist(1);
        initializeAudio(musics[index_playlist]);
    });
}

/**
* Create the database
*/
function createDatabase() {
    var open = indexedDB.open("Musics", 1);
    open.onupgradeneeded = function() {
        var db = open.result;
        var store = db.createObjectStore("Playlist", {keyPath: "name"});
    };
    console.log("Database created!");
}

/**
* Add a playlist to the database
* @param {string} name the name of the playlist
* @param {Array} playlist playlist to add
*/
function addPlaylist(name, playlist) {
    var open = indexedDB.open("Musics", 1);
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("Playlist", "readwrite");
        var store = tx.objectStore("Playlist");
        store.put({name: name, playlist: []});
    };
    addSongs(name, playlist);
}

/**
* Return the playlist with the given name
* @param {string} name 
* @returns {Promise}
*/
async function getPlaylist(name) {
    return new Promise(function (resolve, reject) {
        var open = indexedDB.open("Musics",1);
        open.onsuccess = function() {
            var db = open.result;
            var transaction = db.transaction(["Playlist"], "readwrite");
            var store = transaction.objectStore("Playlist");
            var request = store.get(name);
            request.onsuccess = function(event){
                if(event.target.result) {
                    resolve(event.target.result.playlist);
                } else {
                    resolve(undefined);
                }
            };
            
            request.onerror = function(event) { reject(event) }
            
            transaction.oncomplete = function() {
                db.close();
            };
            transaction.onerror = function(event) { reject(event) }
        };
        open.onerror = function(event) { reject(event) }
    })
}

/**
* Return all the playlists
* @returns {Promise}
*/
async function getAllPlaylist() {
    return new Promise(function (resolve, reject) {
        var open = indexedDB.open("Musics",1);
        open.onsuccess = function() {
            var db = open.result;
            var transaction = db.transaction("Playlist", "readwrite");
            var store = transaction.objectStore("Playlist");
            var request = store.getAll();
            request.onsuccess = function(event){
                resolve(event.target.result);
            };
            
            request.onerror = function(event) { reject(event) }
            
            transaction.oncomplete = function() {
                db.close();
            };
            transaction.onerror = function(event) { reject(event) }
        };
        open.onerror = function(event) { reject(event) }
    });
}

/**
* Delete the playlist with the given name
* @param {string} name the name of the playlist
*/
function deletePlaylist(name) {
    var open = indexedDB.open("Musics", 1);
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("Playlist", "readwrite");
        var store = tx.objectStore("Playlist");
        store.delete(name);
    };
}

/**
* Add songs to the playlist with the given name
* @param {string} name the name of the playlist
* @param {File} song the song to add
*/
function addSong(name, song) {
    var open = indexedDB.open("Musics", 1);
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("Playlist", "readwrite");
        var store = tx.objectStore("Playlist");
        var playlist = store.get(name);
        playlist.onsuccess = function() {
            playlist.result.playlist.push(song);
            store.put(playlist.result);
        };
    };
}

/**
* Add songs to the playlist with the given name
* @param {string} name the name of the playlist
* @param {Array} songs the songs to add
*/
function addSongs(name, songs) {
    var open = indexedDB.open("Musics", 1);
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("Playlist", "readwrite");
        var store = tx.objectStore("Playlist");
        var playlist = store.get(name);
        playlist.onsuccess = function() {
            playlist.result.playlist.push(...songs);
            store.put(playlist.result);
        };
    };
}

function deleteSong(name, song) {
    var open = indexedDB.open("Musics", 1);
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("Playlist", "readwrite");
        var store = tx.objectStore("Playlist");
        var playlist = store.get(name);
        playlist.onsuccess = function() {
            playlist.result.playlist.splice(playlist.result.playlist.indexOf(song), 1);
            store.put(playlist.result);
        };
    };
}

function changeIndexPlaylist(increment) {
    var shuffle;
    chrome.storage.local.get("shuffle", function(result) {
        shuffle = result.shuffle;
    });
    if(shuffle == false) {
        index_playlist = (index_playlist + increment) % musics.length;
    } else {
        index_playlist = Math.floor(Math.random() * musics.length);
    }
        
    chrome.storage.local.set({index_playlist: index_playlist});
}

//delete indexdb
//indexedDB.deleteDatabase("Musics");