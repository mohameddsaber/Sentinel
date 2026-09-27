const endSound = new Audio(chrome.runtime.getURL('sounds/timer-end.wav'));

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "play_end_sound") {
    endSound.currentTime = 0;
    endSound.play();
  }
});