
const urlParams = new URLSearchParams(window.location.search);
//example: /role?userID=1123&roomID=5192
const role = window.location.pathname.replace("/", "");
const gotUserID = urlParams.get('userID');
const gotRoomID = urlParams.get('roomID');


setTimeout(() => {
  console.log(gotUserID, gotRoomID, role);

  if(role == "host"){
    joinLiveAsHost();
  }else if(role == "audience"){
    joinLiveAsAudience();
  }
}, 2000);
// window.onload = () => {
//
// }



const now = new Date().getTime();
const config = {
  // Get your AppID from ZEGOCLOUD Console
  //[My Projects] : https://console.zegocloud.com/project
  appID: 1465251636,
  // Get your Server from ZEGOCLOUD Console
  // [My Projects -> project's Edit -> Basic Configurations -> Server URL] : https://console.zegocloud.com/project"
  serverURL: 'wss://webliveroom1465251636-api.zegocloud.com/ws',
  userID: gotUserID,
  userName: "user_" + gotUserID,
  roomID: gotRoomID,
  tokenServerUrl: "xxxxxx",
};
const data = {
  cameraEnable: true,
  micEnable: true,
  isHost: true,
  isSeat: false,
  coHostID: null,
  hostID: null,
};

initSDK();

// 生成token
function generateToken() {
  // Obtain the token interface provided by the App Server
  // https://testbounce.herokuapp.com/access_token?uid=1234&expired_ts=7200
  return fetch(
    `https://testbounce.herokuapp.com/access_token?uid=${config.userID}&expired_ts=7200`,
    {
      method: "GET",
    }
  ).then((res) => res.json());
}

function initSDK() {
  ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
  ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
    console.warn(
      "[ZEGOCLOUD Log][Demo][onRoomUserUpdate]",
      updateType,
      userList,
      roomID
    );
    const watchingCon = document.querySelector("#watchingCon");
    watchingCon.innerHTML= userList.length;

    userList.forEach((userID) => {
      if (updateType === "ADD") {
        if (data.hostID === userID) {
          triggerRenderViewCon1(
            true,
            ZegoExpressManager.shared.getRemoteVideoView(userID)
          );
        }
      } else {
        if (data.coHostID === userID) {
          ZegoExpressManager.shared.setRoomExtraInfo("coHostID", "-");
          data.coHostID = "-";
          triggerRenderViewCon2(false);
        }
      }
    });
  });
  ZegoExpressManager.shared.onRoomUserDeviceUpdate(
    (updateType, userID, roomID) => {
      console.warn(
        "[ZEGOCLOUD Log][Demo][onRoomUserDeviceUpdate]",
        updateType,
        userID,
        roomID
      );
    }
  );
  ZegoExpressManager.shared.onRoomTokenWillExpire(async (roomID) => {
    console.warn("[ZEGOCLOUD Log][Demo][onRoomTokenWillExpire]", roomID);
    const token = (await generateToken()).token;
    ZegoExpressManager.getEngine().renewToken(token);
  });
  ZegoExpressManager.shared.onRoomExtraInfoUpdate((roomExtraInfoList) => {
    console.warn(
      "[ZEGOCLOUD Log][Demo][onRoomExtraInfoUpdate]",
      roomExtraInfoList
    );
    roomExtraInfoList.forEach((roomExtraInfo) => {
      if (roomExtraInfo.key === "coHostID") {
        // Audience
        data.coHostID = roomExtraInfo.value;

        if (roomExtraInfo.value === "-") {
          triggerRenderViewCon2(false);
        } else {
          triggerRenderViewCon2(
            true,
            ZegoExpressManager.shared.getRemoteVideoView(data.coHostID)
          );
        }
      } else if (roomExtraInfo.key === "hostID") {
        // Host
        data.hostID = roomExtraInfo.value;

        triggerRenderViewCon1(
          true,
          ZegoExpressManager.shared.getRemoteVideoView(data.hostID)
        );
      }
    });
  });
  ZegoExpressManager.shared.onRoomStateUpdate((state) => {
    console.warn("[ZEGOCLOUD Log][Demo][onRoomStateUpdate]", state);
    // state: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
    if (state === "CONNECTED" && data.isHost) {
      ZegoExpressManager.shared.setRoomExtraInfo("hostID", config.userID);
      data.hostID = config.userID;
    }
  });

  // Check
  ZegoExpressManager.shared.checkWebRTC();
  ZegoExpressManager.shared.checkCamera();
  ZegoExpressManager.shared.checkMicrophone();

}
async function joinLiveAsHost() {

  data.isHost = true;

  const roomID = config.roomID
  if (!roomID) {
    return;
  }
  // config.roomID = roomID;

  const token = (await generateToken()).token;
    // console.log(await generateToken());
  await ZegoExpressManager.shared.joinRoom(
    roomID,
    token,
    { userID: config.userID, userName: config.userName },
    [1, 2, 4, 8]
  );

  triggerPageView("main");
  triggerRenderViewCon1(true, ZegoExpressManager.shared.getLocalVideoView());
  triggerSeatView(false);
}

async function joinLiveAsAudience() {
  data.isHost = false;

  const roomID = config.roomID;
  if (!roomID) {
    return;
  }
  // config.roomID = roomID;

  const token = (await generateToken()).token;
  if (!token) {
    alert(
      "Please read the readme document first to configure the token correctly！"
    );
    return;
  }
  await ZegoExpressManager.shared.joinRoom(
    roomID,
    token,
    { userID: config.userID, userName: config.userName },
    [1, 2]
  );

  triggerPageView("main");
  triggerCameraView(false);
  triggerMicView(false);
  triggerSeatView(true);

}

function seatHandle() {
  !data.isSeat ? up() : down();
}
function up() {
  if (data.coHostID && data.coHostID !== "-") {
    // There's someone at the mic
    return;
  }
  triggerRenderViewCon2(true, ZegoExpressManager.shared.getLocalVideoView());

  ZegoExpressManager.shared.enableCamera(true);
  ZegoExpressManager.shared.enableMic(true);
  ZegoExpressManager.shared.setRoomExtraInfo("coHostID", config.userID);

  data.coHostID = config.userID;
  data.isSeat = true;

  triggerCameraView(true);
  triggerMicView(true);
}
function down() {
  ZegoExpressManager.shared.enableCamera(false);
  ZegoExpressManager.shared.enableMic(false);
  ZegoExpressManager.shared.setRoomExtraInfo("coHostID", "-");

  data.coHostID = "-";
  data.isSeat = false;

  triggerRenderViewCon2(false);
  triggerCameraView(false);
  triggerMicView(false);
}


function enableCamera() {
  const result = ZegoExpressManager.shared.enableCamera(!data.cameraEnable);

  const camCon = document.getElementById('camera-con');

  if(data.cameraEnable){
    camCon.style.color = "#555";

    console.log("Muted");
  }else{
    camCon.style.color = "#FF9D0E";

    console.log("Non Muted");
  }

  result && (data.cameraEnable = !data.cameraEnable);
}
function enableMic() {
  result = ZegoExpressManager.shared.enableMic(!data.micEnable);

  const microphoCon = document.getElementById('mic-con');

  if(data.micEnable){
    microphoCon.style.color = "#555";
    console.log("Muted");
  }else{
    microphoCon.style.color = "#FF9D0E";
    console.log("Non Muted");
  }

  result && (data.micEnable = !data.micEnable);
}
function leaveRoom() {
  ZegoExpressManager.shared.leaveRoom();

  window.location = `https://b-bounce.com/live_closed.php?roomID=${config.roomID}`;
}
// Dom
function triggerPageView(page) {
  const homePageView = document.querySelector("#home-page");
  const mainPageView = document.querySelector("#main-page");
  if (page === "home") {
    homePageView.classList.remove("hide");
    mainPageView.classList.add("hide");
  } else {
    homePageView.classList.add("hide");
    mainPageView.classList.remove("hide");
  }
}
function triggerRenderViewCon1(show, videoDom) {

  const renderViewCon1 = document.querySelector("#video-con1");
  if (show) {
  
