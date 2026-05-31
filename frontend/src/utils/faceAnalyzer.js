// faceAnalyzer.js - Mathematical vision processing library using face-api.js
import * as faceapi from '@vladmandic/face-api';

const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

// Cache initial head height for slouch detection
let initialFaceCenterY = null;
let blinkCounter = 0;
let lastClosedState = false;
let closedStartTime = null;
let prolongedClosuresCount = 0;
let blinkTimes = [];

export const loadFaceApiModels = async () => {
  console.log('🔮 Loading face-api.js neural weights from CDN...');
  try {
    // Load models from CDN
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_CDN);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN);
    console.log('✅ face-api.js models loaded successfully.');
    return true;
  } catch (error) {
    console.error('❌ Failed to load face-api.js models:', error);
    return false;
  }
};

// Reset telemetry baseline
export const resetVisionBaseline = () => {
  initialFaceCenterY = null;
  blinkCounter = 0;
  lastClosedState = false;
  closedStartTime = null;
  prolongedClosuresCount = 0;
  blinkTimes = [];
};

// Calculate Euclidean Distance between two vectors
const euclideanDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Calculate Eye Aspect Ratio (EAR)
const calcEyeEAR = (landmarks) => {
  // Landmarks points: left eye is 36-41, right eye is 42-47
  // EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
  const p1 = landmarks[0];
  const p2 = landmarks[1];
  const p3 = landmarks[2];
  const p4 = landmarks[3];
  const p5 = landmarks[4];
  const p6 = landmarks[5];

  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);

  return (vertical1 + vertical2) / (2.0 * horizontal);
};

export const analyzeFaceTelemetry = async (videoElement) => {
  if (!videoElement || videoElement.paused || videoElement.ended) {
    return { present: false };
  }

  // Detect face, landmarks, emotions, and face descriptor
  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();

  if (!detection) {
    return { present: false, message: 'No patient detected in camera view.' };
  }

  const landmarks = detection.landmarks.positions;
  const box = detection.detection.box;
  
  // --------------------------------------------------------
  // 1. FATIGUE DETECTION: EYE ASPECT RATIO (EAR) & BLINKS
  // --------------------------------------------------------
  const leftEyePoints = landmarks.slice(36, 42);
  const rightEyePoints = landmarks.slice(42, 48);

  const leftEAR = calcEyeEAR(leftEyePoints);
  const rightEAR = calcEyeEAR(rightEyePoints);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  // Eye closure threshold
  const EAR_THRESHOLD = 0.22;
  const isClosedNow = avgEAR < EAR_THRESHOLD;
  const now = Date.now();

  let microSleepAlert = false;

  // Track blinks
  if (isClosedNow && !lastClosedState) {
    // Transition to closed
    closedStartTime = now;
  } else if (!isClosedNow && lastClosedState) {
    // Transition to open (blink completed)
    const closureDuration = now - (closedStartTime || now);
    
    if (closureDuration < 800) {
      // Normal quick blink
      blinkCounter++;
      blinkTimes.push(now);
    } else {
      // Prolonged closure -> micro-sleep/high fatigue event!
      prolongedClosuresCount++;
    }
  }

  // Check if eye is currently experiencing prolonged closure
  if (isClosedNow && closedStartTime && (now - closedStartTime > 800)) {
    microSleepAlert = true;
  }

  lastClosedState = isClosedNow;

  // Calculate live Blink Rate (Blinks per minute)
  // Prune blink log older than 60 seconds
  const oneMinuteAgo = now - 60000;
  blinkTimes = blinkTimes.filter(t => t > oneMinuteAgo);
  const liveBlinkRate = blinkTimes.length;

  // --------------------------------------------------------
  // 2. ATTENTION MONITORING & HEAD POSITION
  // --------------------------------------------------------
  // Points: Nose tip (30), Left eye center (avg 36-41), Right eye center (avg 42-47), Mouth center (avg 48-67)
  const noseTip = landmarks[30];
  
  const getCenter = (points) => {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  };

  const leftEyeCenter = getCenter(leftEyePoints);
  const rightEyeCenter = getCenter(rightEyePoints);
  const mouthCenter = getCenter(landmarks.slice(48, 68));

  // YAW: Horizontal head rotation
  // Compare distance from nose tip to left eye vs right eye
  const distLeft = Math.abs(noseTip.x - leftEyeCenter.x);
  const distRight = Math.abs(noseTip.x - rightEyeCenter.x);
  const yawRatio = Math.max(distLeft, distRight) / Math.max(0.1, Math.min(distLeft, distRight));

  // PITCH: Vertical head rotation
  // Compare eye-to-nose vertical distance to nose-to-mouth vertical distance
  const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2.0;
  const eyeToNose = Math.max(0.1, noseTip.y - eyeCenterY);
  const noseToMouth = Math.max(0.1, mouthCenter.y - noseTip.y);
  const pitchRatio = eyeToNose / noseToMouth;

  // Slouch Detection: track face center drifting downwards
  const faceCenterY = box.y + (box.height / 2.0);
  if (initialFaceCenterY === null) {
    initialFaceCenterY = faceCenterY;
  }
  // If face slides down by more than 15% of screen height or box height, indicate slouch
  const slouchOffset = faceCenterY - initialFaceCenterY;
  const slouching = slouchOffset > (box.height * 0.2);

  // Screen Attention Flag: turned away (> 15 deg) or looking up/down (> 15 deg)
  const isTurnedAway = yawRatio > 1.55;
  const isLookingDownOrUp = pitchRatio < 0.55 || pitchRatio > 1.45;
  const screenAttention = (!isTurnedAway && !isLookingDownOrUp) ? 'Attentive' : 'Distracted';
  const attentionScore = screenAttention === 'Attentive' ? 100 : 30;

  // --------------------------------------------------------
  // 3. EMOTION EXTRACTION & STRESSED ALGORITHM
  // --------------------------------------------------------
  const exp = detection.expressions;
  // Map standard emotions and compute "Stressed" frequency
  const rawHappy = exp.happy || 0;
  const rawSad = exp.sad || 0;
  const rawNeutral = exp.neutral || 0;
  const rawAngry = exp.angry || 0;
  const rawFearful = exp.fear || 0;
  const rawSurprised = exp.surprised || 0;
  
  // Stressed is defined by combination of fear, micro-expressions of anger/sadness, and surprise elements
  const rawStressed = Math.min(1.0, (rawFearful * 0.5) + (rawSurprised * 0.3) + (rawSad * 0.2));

  // Normalize mapping (Happy, Sad, Neutral, Angry, Stressed) to equal 100%
  const total = rawHappy + rawSad + rawNeutral + rawAngry + rawStressed;
  const normalizer = total > 0 ? 100 / total : 100;

  const emotionData = {
    happy: Math.round(rawHappy * normalizer),
    sad: Math.round(rawSad * normalizer),
    neutral: Math.round(rawNeutral * normalizer),
    angry: Math.round(rawAngry * normalizer),
    stressed: Math.round(rawStressed * normalizer)
  };

  // --------------------------------------------------------
  // 4. FATIGUE SCORE CALCULATION
  // --------------------------------------------------------
  // Normal blink rate is 12-18 bpm. High deviation (e.g. rate < 6 or rate > 24) increases strain fatigue
  let blinkDeviation = 0;
  if (liveBlinkRate < 6) {
    blinkDeviation = (6 - liveBlinkRate) * 10; // lower rate = dry eyes = high strain fatigue
  } else if (liveBlinkRate > 24) {
    blinkDeviation = (liveBlinkRate - 24) * 5; // higher rate = nervous fatigue
  }

  // Build a weighted score (0 - 100)
  let computedFatigue = 25; // baseline resting fatigue
  
  // Add weight of eyes closed
  if (isClosedNow) computedFatigue += 20;
  
  // Add weight of prolonged micro-sleeps
  computedFatigue += prolongedClosuresCount * 15;
  
  // Add weight of blink rate strain
  computedFatigue += blinkDeviation;
  
  // Add weight of body slouching
  if (slouching) computedFatigue += 15;
  
  // Add emotional stress factor
  computedFatigue += (emotionData.stressed * 0.3);

  // Cap score between 0 and 100
  const fatigueScore = Math.max(10, Math.min(100, Math.round(computedFatigue)));

  return {
    present: true,
    descriptor: Array.from(detection.descriptor), // standard array for auth matching
    avgEAR: Number(avgEAR.toFixed(3)),
    isClosed: isClosedNow,
    blinkRate: liveBlinkRate,
    totalBlinks: blinkCounter,
    microSleep: microSleepAlert,
    attention: screenAttention,
    attentionScore,
    slouching,
    fatigueScore,
    emotionData,
    box: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    }
  };
};
