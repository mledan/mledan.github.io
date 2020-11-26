(function () {
  if (!console) {
    console = {};
  }
  var old = console.log;
  var logger = document.getElementById('log');
  console.log = function (message) {
    if (typeof message == 'object') {
      old((JSON && JSON.stringify ? JSON.stringify(message) : String(message)));
      logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : String(message)) + '<br />';
    } else {
      old(message);
      logger.innerHTML += message + '<br />';
    }
  }
})();

// Utility
function jsonToQueryString(json) {
  return Object.keys(json).map(function (key) {
    return encodeURIComponent(key) + '=' +
      encodeURIComponent(json[key]);
  }).join('&');
}

var pretag = document.querySelector("pre");//get the tag

pretag.addEventListener("keyup", function (e) {
  // in here goes the call to check if it's valid, if it is put a check mark, 
  //  if not put an x
  const pre = document.querySelector("pre");//get the tag
  const text = pre.textContent;
  const html = pre.innerHTML;
  
  try {
    userPrincipalsResponse = JSON.parse(text);
    //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
    var tokenTimeStampAsDateObj = new Date(userPrincipalsResponse.streamerInfo.tokenTimestamp);
    tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();
    
    console.log("Valid JSON Detected");
    pre.style.outlineColor = "green";

    mySock = new WebSocket("wss://" + userPrincipalsResponse.streamerInfo.streamerSocketUrl + "/ws");

    mySock.onmessage = function (evt) { console.log(evt.data); }; mySock.onclose = function () { console.log("CLOSED"); };
  }
  catch {
    console.log("Need Valid User Principals response for this to work");
    console.log("Hint: It's the response of: https://developer.tdameritrade.com/user-principal/apis/get/userprincipals-0");

    pre.style.outlineColor = "red";
  }
});


var sendLoginRequest = function (blar) {
  const pre = document.querySelector("pre");//get the tag
  const text = pre.textContent;
  const html = pre.innerHTML;
  userPrincipalsResponse = JSON.parse(text);
  //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
  var tokenTimeStampAsDateObj = new Date(userPrincipalsResponse.streamerInfo.tokenTimestamp);
  tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

  credentials = {
    "userid": userPrincipalsResponse.accounts[0].accountId,
    "token": userPrincipalsResponse.streamerInfo.token,
    "company": userPrincipalsResponse.accounts[0].company,
    "segment": userPrincipalsResponse.accounts[0].segment,
    "cddomain": userPrincipalsResponse.accounts[0].accountCdDomainId,
    "usergroup": userPrincipalsResponse.streamerInfo.userGroup,
    "accesslevel": userPrincipalsResponse.streamerInfo.accessLevel,
    "authorized": "Y",
    "timestamp": tokenTimeStampAsMs,
    "appid": userPrincipalsResponse.streamerInfo.appId,
    "acl": userPrincipalsResponse.streamerInfo.acl
  }

  loginRequest = {
    "requests": [
      {
        "service": "ADMIN",
        "command": "LOGIN",
        "requestid": 0,
        "account": userPrincipalsResponse.accounts[0].accountId,
        "source": userPrincipalsResponse.streamerInfo.appId,
        "parameters": {
          "credential": jsonToQueryString(credentials),
          "token": userPrincipalsResponse.streamerInfo.token,
          "version": "1.0"
        }
      }
    ]
  }

  console.log("Sending " + blar);
  mySock.send(JSON.stringify(loginRequest));
}

var sendLogoutRequest = function (blar) {

  const pre = document.querySelector("pre");//get the tag
  const text = pre.textContent;
  const html = pre.innerHTML;
  userPrincipalsResponse = JSON.parse(text);
  //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
  var tokenTimeStampAsDateObj = new Date(userPrincipalsResponse.streamerInfo.tokenTimestamp);
  tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

  credentials = {
    "userid": userPrincipalsResponse.accounts[0].accountId,
    "token": userPrincipalsResponse.streamerInfo.token,
    "company": userPrincipalsResponse.accounts[0].company,
    "segment": userPrincipalsResponse.accounts[0].segment,
    "cddomain": userPrincipalsResponse.accounts[0].accountCdDomainId,
    "usergroup": userPrincipalsResponse.streamerInfo.userGroup,
    "accesslevel": userPrincipalsResponse.streamerInfo.accessLevel,
    "authorized": "Y",
    "timestamp": tokenTimeStampAsMs,
    "appid": userPrincipalsResponse.streamerInfo.appId,
    "acl": userPrincipalsResponse.streamerInfo.acl
  }
  logoutRequest = {
    "requests": [
      {
        "service": "ADMIN",
        "command": "LOGOUT",
        "requestid": 1,
        "account": userPrincipalsResponse.accounts[0].accountId,
        "source": userPrincipalsResponse.streamerInfo.appId,
        "parameters": {
          //"credential": jsonToQueryString(credentials),
          //"token": userPrincipalsResponse.streamerInfo.token,
          //"version": "1.0"
        }
      }
    ]
  }
  console.log("Sending " + blar);
  mySock.send(JSON.stringify(logoutRequest));
}

var sendSubsRequest = function (blar) {

  const pre = document.querySelector("pre");//get the tag
  const text = pre.textContent;
  const html = pre.innerHTML;
  userPrincipalsResponse = JSON.parse(text);
  //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
  var tokenTimeStampAsDateObj = new Date(userPrincipalsResponse.streamerInfo.tokenTimestamp);
  tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

  credentials = {
    "userid": userPrincipalsResponse.accounts[0].accountId,
    "token": userPrincipalsResponse.streamerInfo.token,
    "company": userPrincipalsResponse.accounts[0].company,
    "segment": userPrincipalsResponse.accounts[0].segment,
    "cddomain": userPrincipalsResponse.accounts[0].accountCdDomainId,
    "usergroup": userPrincipalsResponse.streamerInfo.userGroup,
    "accesslevel": userPrincipalsResponse.streamerInfo.accessLevel,
    "authorized": "Y",
    "timestamp": tokenTimeStampAsMs,
    "appid": userPrincipalsResponse.streamerInfo.appId,
    "acl": userPrincipalsResponse.streamerInfo.acl
  }
  subsRequest = {
    "requests": [
      {
        "service": "LEVELONE_FUTURES",
        "requestid": 2,
        "command": "SUBS",
        "account": userPrincipalsResponse.accounts[0].accountId,
        "source": userPrincipalsResponse.streamerInfo.appId,
        "parameters": {
          "keys": "/ES",
          "fields": "0,1,2,3,4"
        }
      }
    ]
  }
  console.log("Sending " + blar);
  mySock.send(JSON.stringify(subsRequest));
}

var sendUnubsRequest = function (blar) {

  const pre = document.querySelector("pre");//get the tag
  const text = pre.textContent;
  const html = pre.innerHTML;
  userPrincipalsResponse = JSON.parse(text);
  //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
  var tokenTimeStampAsDateObj = new Date(userPrincipalsResponse.streamerInfo.tokenTimestamp);
  tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

  credentials = {
    "userid": userPrincipalsResponse.accounts[0].accountId,
    "token": userPrincipalsResponse.streamerInfo.token,
    "company": userPrincipalsResponse.accounts[0].company,
    "segment": userPrincipalsResponse.accounts[0].segment,
    "cddomain": userPrincipalsResponse.accounts[0].accountCdDomainId,
    "usergroup": userPrincipalsResponse.streamerInfo.userGroup,
    "accesslevel": userPrincipalsResponse.streamerInfo.accessLevel,
    "authorized": "Y",
    "timestamp": tokenTimeStampAsMs,
    "appid": userPrincipalsResponse.streamerInfo.appId,
    "acl": userPrincipalsResponse.streamerInfo.acl
  }
  unsubsRequest = {
    "requests": [
      {
        "service": "LEVELONE_FUTURES",
        "requestid": 3,
        "command": "UNSUBS",
        "account": userPrincipalsResponse.accounts[0].accountId,
        "source": userPrincipalsResponse.streamerInfo.appId,
        "parameters": {
          "keys": "/ES",
          "fields": "0,1,2,3,4"
        }
      }
    ]
  };
  console.log("Sending " + blar);
  mySock.send(JSON.stringify(unsubsRequest));
}

var sendRequest = function (blar) {

  console.log("Can't send  " + blar + "!");
  console.log("You need to work harder!!");
  //mySock.send(JSON.stringify(subsRequest));
}




