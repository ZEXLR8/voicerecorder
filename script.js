const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const transcriptDiv = document.getElementById('transcript');
const audioContainer = document.getElementById('audio-container');

const status = document.createElement('p');
status.setAttribute('role', 'status');
transcriptDiv.insertAdjacentElement('afterend', status);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let mediaRecorder = null;
let audioStream = null;
let audioChunks = [];
let isRecording = false;
let finalTranscript = '';

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    transcriptDiv.textContent = finalTranscript + interimTranscript;
  };

  recognition.onerror = (event) => {
    status.textContent = event.error === 'not-allowed'
      ? 'Microphone access was denied. Allow microphone access and try again.'
      : `Transcription error: ${event.error}.`;
  };

  recognition.onend = () => {
    if (isRecording) {
      try {
        recognition.start();
      } catch (error) {
        // The browser may still be finishing the previous recognition session.
      }
    }
  };
} else {
  status.textContent = 'Speech recognition is not supported in this browser. Try a supported browser such as Chrome.';
}

startBtn.onclick = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    finalTranscript = '';
    transcriptDiv.textContent = '';

    mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      if (audioChunks.length) {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(blob);
        audioContainer.appendChild(audio);
      }
      audioStream.getTracks().forEach((track) => track.stop());
      audioStream = null;
      audioChunks = [];
    };

    mediaRecorder.start();
    isRecording = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    if (recognition) {
      status.textContent = 'Listening…';
      try {
        recognition.start();
      } catch (error) {
        status.textContent = 'Recording audio, but speech recognition could not start. Try again.';
      }
    }
  } catch (error) {
    status.textContent = `Could not start recording: ${error.message}`;
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      audioStream = null;
    }
  }
};

stopBtn.onclick = () => {
  isRecording = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if (recognition) recognition.stop();

  startBtn.disabled = false;
  stopBtn.disabled = true;
  if (recognition) status.textContent = 'Recording stopped.';
};
