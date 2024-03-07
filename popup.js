document.addEventListener('DOMContentLoaded', main);
function main() {
    document.getElementById("music").addEventListener('change', upload);  
    document.getElementById("play").addEventListener('click', play);
    document.getElementById("shuffle").addEventListener('click', shuffle);
    document.getElementById("previous").addEventListener('click', previous);
    document.getElementById("next").addEventListener('click', next);
    document.getElementById("reset").addEventListener('click', reset);
    var soundBar = document.getElementById("volume");
    chrome.storage.local.get(['volume'], function(result) {
        if(result.volume){
            console.log("Volume Found!");
            soundBar.value = result.volume*100;
            document.getElementById("volumeLabel").innerHTML = "Volume : " + result.volume*100 + "%";
        } else {
            console.log("No volume saved!");
            soundBar.value = 100;
            document.getElementById("volumeLabel").innerHTML = "Volume : 100%";
        }
    });
    chrome.storage.local.get(['play'], function(result) {
        var playImage = document.getElementById("playImage");
        if(result.play == true || result.play === undefined){
            playImage.src = "./images/pause.svg";
            chrome.storage.local.set({play: true});
        } else {
            playImage.src = "./images/play.svg";
        }
    });
    chrome.storage.local.get(['shuffle'], function(result) {
        var shuffleImage = document.getElementById("shuffleImage");
        if(result.shuffle == true || result.shuffle === undefined){
            shuffleImage.src = "images/shuffle_enable.png";
            chrome.storage.local.set({shuffle: true});
        } else {
            shuffleImage.src = "images/shuffle_disable.png";
        }
    });

    soundBar.addEventListener('change', volume);
}
async function upload(event) {
    console.log("Uploading...");
    var musics = event.target.files;
    console.log(musics);
    var musics_serialized = [];

    for(var i = 0; i < musics.length; i++){
        var music = musics[i];
        var music_serialized = await serialize(music);
        musics_serialized.push(music_serialized);
    }
    console.log(musics_serialized);

    // var serialized_music = await serialize(music);
    
    chrome.runtime.sendMessage({command:"upload",value:musics_serialized}, function(response) {
        console.log(response);
    });
}

function play() {
    chrome.storage.local.get(['play'], function(result) {
        var playImage = document.getElementById("playImage");
        console.log(result);
        if(result && !result.play){
            console.log("Play!");
            playImage.src = "images/pause.svg";
            chrome.storage.local.set({play: true});
            chrome.runtime.sendMessage({command:"play"}, function(response) {
                console.log(response);
            });
        } else {
            console.log("Pause!");
            playImage.src = "images/play.svg";
            chrome.storage.local.set({play: false});
            chrome.runtime.sendMessage({command:"pause"}, function(response) {
                console.log(response);
            });
        }
    });
}


function previous() {
    console.log("Previous...");
    chrome.runtime.sendMessage({command:"previous"}, function(response) {
        console.log(response);
    });
}

function next() {
    console.log("Next...");
    chrome.runtime.sendMessage({command:"next"}, function(response) {
        console.log(response);
    });
}

function reset() {
    console.log("Resetting...");
    chrome.runtime.sendMessage({command:"reset"}, function(response) {
        console.log(response);
    });
}

function volume(event) {
    var sound = event.target.value;
    console.log("Volume : " + sound + "%");
    chrome.runtime.sendMessage({command:"volume",value:sound/100}, function(response) {
        console.log(response);
    });
    document.getElementById("volumeLabel").innerHTML = "Volume : " + sound + "%";
}

function shuffle() {
    chrome.storage.local.get(['shuffle'], function(result) {
        var shuffleImage = document.getElementById("shuffleImage");
        if(result && !result.shuffle){
            shuffleImage.src = "images/shuffle_enable.png";
            chrome.storage.local.set({shuffle: true});
        } else {
            shuffleImage.src = "images/shuffle_disable.png";
            chrome.storage.local.set({shuffle: false});
        }
    });
}



async function serialize(src) {
    const cls = Object.prototype.toString.call(src).slice(8, -1);

    return new Promise(resolve => {
        const { name, type, lastModified } = src;
        const reader = new FileReader();
        reader.onload = () => resolve({
            cls, name, type, lastModified,
            value: reader.result.slice(reader.result.indexOf(',') + 1),
        });
        reader.readAsDataURL(src);
    });
}