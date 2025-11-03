"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";

// From src/lib/types.ts
type Algorithm = "FCFS" | "SSTF" | "SCAN" | "CSCAN" | "LOOK" | "CLOOK";
type Direction = "up" | "down";

// From src/lib/disk-scheduling.ts
interface SchedulingArgs {
  requests: number[];
  startPos: number;
}

interface DirectionalSchedulingArgs extends SchedulingArgs {
  direction: Direction;
}

interface BoundedSchedulingArgs extends DirectionalSchedulingArgs {
  numTracks: number;
}

function fcfs({ requests, startPos }: SchedulingArgs) {
  let sequence = [startPos, ...requests];
  let totalHeadMovement = 0;
  for (let i = 0; i < sequence.length - 1; i++) {
    totalHeadMovement += Math.abs(sequence[i + 1] - sequence[i]);
  }
  return { sequence, totalHeadMovement };
}

function sstf({ requests, startPos }: SchedulingArgs) {
  let current = startPos;
  const unsortedRequests = [...requests];
  let sequence = [current];
  let totalHeadMovement = 0;

  while (unsortedRequests.length > 0) {
    let closestIndex = -1;
    let minDistance = Infinity;

    unsortedRequests.forEach((req, index) => {
      const distance = Math.abs(req - current);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== -1) {
      const nextRequest = unsortedRequests[closestIndex];
      totalHeadMovement += Math.abs(nextRequest - current);
      current = nextRequest;
      sequence.push(current);
      unsortedRequests.splice(closestIndex, 1);
    }
  }
  return { sequence, totalHeadMovement };
}

function handleDirectionalScan(
  requests: number[],
  startPos: number,
  direction: Direction,
  addBounds: boolean,
  isCircular: boolean,
  numTracks: number = 200
) {
  let sequence: number[] = [startPos];
  const sortedRequests = [...requests].sort((a, b) => a - b);

  let left = sortedRequests.filter((r) => r < startPos).sort((a, b) => b - a);
  let right = sortedRequests.filter((r) => r >= startPos).sort((a, b) => a - b);

  if (direction === "up") {
    sequence.push(...right);
    if (
      addBounds &&
      (right.length === 0 || right[right.length - 1] !== numTracks - 1)
    ) {
      if (left.length > 0) sequence.push(numTracks - 1);
    }

    if (isCircular) {
      if (left.length > 0) {
        if (addBounds) sequence.push(0);
        sequence.push(...left.reverse());
      }
    } else {
      sequence.push(...left);
    }
  } else {
    // direction 'down'
    sequence.push(...left);
    if (addBounds && (left.length === 0 || left[left.length - 1] !== 0)) {
      if (right.length > 0) sequence.push(0);
    }

    if (isCircular) {
      if (right.length > 0) {
        if (addBounds) sequence.push(numTracks - 1);
        sequence.push(...right.reverse());
      }
    } else {
      sequence.push(...right);
    }
  }

  // Recalculate total head movement based on the final sequence
  let totalHeadMovement = 0;
  for (let i = 0; i < sequence.length - 1; i++) {
    totalHeadMovement += Math.abs(sequence[i + 1] - sequence[i]);
  }

  return { sequence, totalHeadMovement };
}

function scan({
  requests,
  startPos,
  direction,
  numTracks,
}: BoundedSchedulingArgs) {
  return handleDirectionalScan(
    requests,
    startPos,
    direction,
    true,
    false,
    numTracks
  );
}

function cscan({
  requests,
  startPos,
  direction,
  numTracks,
}: BoundedSchedulingArgs) {
  return handleDirectionalScan(
    requests,
    startPos,
    direction,
    true,
    true,
    numTracks
  );
}

function look({
  requests,
  startPos,
  direction,
}: DirectionalSchedulingArgs) {
  return handleDirectionalScan(requests, startPos, direction, false, false);
}

function clook({
  requests,
  startPos,
  direction,
}: DirectionalSchedulingArgs) {
  return handleDirectionalScan(requests, startPos, direction, false, true);
}

// From src/hooks/useDiskScheduler.ts
const NUM_TRACKS = 200;

function useDiskScheduler() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [currentPos, setCurrentPos] = useState(53);
  const [prevPos, setPrevPos] = useState(30);
  const [requestQueue, setRequestQueue] = useState(
    "98, 183, 37, 122, 14, 124, 65, 67"
  );
  const [sequence, setSequence] = useState<number[]>([]);
  const [totalHeadMovement, setTotalHeadMovement] = useState(0);
  const [animatedSequence, setAnimatedSequence] = useState<number[]>([]);
  const [direction, setDirection] = useState<Direction>("up");

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const requests = requestQueue
    .split(",")
    .map((req) => parseInt(req.trim(), 10))
    .filter((req) => !isNaN(req) && req >= 0 && req < NUM_TRACKS);

  const calculateSequence = () => {
    let result;
    const commonParams = {
      requests: [...requests],
      startPos: currentPos,
    };

    const directionalParams = {
      ...commonParams,
      direction,
    };

    const boundedParams = {
      ...directionalParams,
      numTracks: NUM_TRACKS,
    };

    switch (algorithm) {
      case "FCFS":
        result = fcfs(commonParams);
        break;
      case "SSTF":
        result = sstf(commonParams);
        break;
      case "SCAN":
        result = scan(boundedParams);
        break;
      case "CSCAN":
        result = cscan(boundedParams);
        break;
      case "LOOK":
        result = look(directionalParams);
        break;
      case "CLOOK":
        result = clook(directionalParams);
        break;
      default:
        result = { sequence: [], totalHeadMovement: 0 };
    }

    setSequence(result.sequence);
    setTotalHeadMovement(result.totalHeadMovement);
    setCurrentStep(0);
    setAnimatedSequence([]);
    setIsPlaying(false);
  };

  const play = useCallback(() => {
    if (currentStep < sequence.length) {
      setIsPlaying(true);
    }
  }, [currentStep, sequence.length]);

  const pause = () => {
    setIsPlaying(false);
  };

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, sequence.length));
  }, [sequence.length]);

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (sequence.length > 0) {
      setAnimatedSequence(sequence.slice(0, currentStep + 1));
    } else {
      setAnimatedSequence([]);
    }
  }, [currentStep, sequence]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentStep < sequence.length) {
      interval = setInterval(() => {
        nextStep();
      }, 300);
    } else if (currentStep >= sequence.length) {
      setIsPlaying(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStep, sequence.length, nextStep]);

  return {
    algorithm,
    setAlgorithm,
    currentPos,
    setCurrentPos,
    prevPos,
    setPrevPos,
    requestQueue,
    setRequestQueue,
    sequence,
    totalHeadMovement,
    animatedSequence,
    direction,
    setDirection,
    requests,
    calculateSequence,
    NUM_TRACKS,
    isPlaying,
    play,
    pause,
    nextStep,
    prevStep,
    currentStep,
  };
}

// From src/components/Controls.tsx
interface ControlsProps {
  algorithm: Algorithm;
  setAlgorithm: (value: Algorithm) => void;
  direction: Direction;
  setDirection: (value: Direction) => void;
  currentPos: number;
  setCurrentPos: (value: number) => void;
  prevPos: number;
  setPrevPos: (value: number) => void;
  requestQueue: string;
  setRequestQueue: (value: string) => void;
  calculateSequence: () => void;
  NUM_TRACKS: number;
}

function Controls({
  algorithm,
  setAlgorithm,
  direction,
  setDirection,
  currentPos,
  setCurrentPos,
  prevPos,
  setPrevPos,
  requestQueue,
  setRequestQueue,
  calculateSequence,
  NUM_TRACKS,
}: ControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div>
        <label
          htmlFor="algorithm"
          className="block text-sm font-medium text-text/80 mb-1"
        >
          Algorithm
        </label>
        <select
          id="algorithm"
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
          className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
        >
          <option value="FCFS">FCFS</option>
          <option value="SSTF">SSTF</option>
          <option value="SCAN">SCAN</option>
          <option value="CSCAN">C-SCAN</option>
          <option value="LOOK">LOOK</option>
          <option value="CLOOK">C-LOOK</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="direction"
          className="block text-sm font-medium text-text/80 mb-1"
        >
          Direction
        </label>
        <select
          id="direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as "up" | "down")}
          className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
        >
          <option value="up">Up (towards 199)</option>
          <option value="down">Down (towards 0)</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="currentPos"
          className="block text-sm font-medium text-text/80 mb-1"
        >
          Current Position
        </label>
        <input
          type="number"
          id="currentPos"
          value={currentPos}
          onChange={(e) => setCurrentPos(parseInt(e.target.value, 10))}
          className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
          min="0"
          max={NUM_TRACKS - 1}
        />
      </div>
      <div>
        <label
          htmlFor="prevPos"
          className="block text-sm font-medium text-text/80 mb-1"
        >
          Previous Position
        </label>
        <input
          type="number"
          id="prevPos"
          value={prevPos}
          onChange={(e) => setPrevPos(parseInt(e.target.value, 10))}
          className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
          min="0"
          max={NUM_TRACKS - 1}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <label
          htmlFor="requestQueue"
          className="block text-sm font-medium text-text/80 mb-1"
        >
          Request Queue (comma-separated)
        </label>
        <input
          type="text"
          id="requestQueue"
          value={requestQueue}
          onChange={(e) => setRequestQueue(e.target.value)}
          className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-4 flex justify-center mt-4">
        <button
          onClick={calculateSequence}
          className="px-8 py-3 bg-purple hover:bg-purple/80 text-white font-bold rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Start Simulation
        </button>
      </div>
    </div>
  );
}

// From src/components/MovementGraph.tsx
interface MovementGraphProps {
  sequence: number[];
}

function MovementGraph({ sequence }: MovementGraphProps) {
  const data = sequence.map((value, index) => ({
    step: index,
    position: value,
  }));

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-center text-purple">
        Head Movement Graph
      </h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="step"
              label={{ value: "Step", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{
                value: "Track Position",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="position"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Head Position"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// From src/components/GramophoneDisc.tsx
const DISC_SIZE = 300;

interface GramophoneDiscProps {
  requests: number[];
  animatedSequence: number[];
}

function GramophoneDisc({
  requests,
  animatedSequence,
}: GramophoneDiscProps) {
  const getPositionOnDisc = (track: number) => {
    const radius = (track / (NUM_TRACKS - 1)) * (DISC_SIZE / 2);
    return radius;
  };

  const currentTrack =
    animatedSequence.length > 0
      ? animatedSequence[animatedSequence.length - 1]
      : -1;
  const currentRadius =
    currentTrack !== -1 ? getPositionOnDisc(currentTrack) : 0;

  return (
    <div
      className="flex justify-center items-center"
      style={{ height: DISC_SIZE + 50 }}
    >
      <div
        className="relative"
        style={{ width: DISC_SIZE, height: DISC_SIZE }}
      >
        {/* Disc */}
        <div className="w-full h-full rounded-full bg-gray-800 flex justify-center items-center">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
        </div>

        {/* Concentric Circles for Tracks */}
        {requests.map((req) => {
          const radius = getPositionOnDisc(req);
          return (
            <div
              key={`disc-req-${req}`}
              className="absolute top-1/2 left-1/2 border border-dashed border-gray-600 rounded-full"
              style={{
                width: radius * 2,
                height: radius * 2,
                transform: `translate(-50%, -50%)`,
              }}
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 text-xs text-gray-400">
                {req}
              </span>
            </div>
          );
        })}

        {/* Head */}
        <motion.div
          className="absolute top-1/2 left-1/2 h-1 bg-purple origin-left"
          style={{
            width: DISC_SIZE / 2,
            transformOrigin: "0% 50%",
          }}
          initial={{ rotate: 0 }}
          animate={{
            rotate:
              animatedSequence.length > 1
                ? (animatedSequence.indexOf(currentTrack) /
                  (animatedSequence.length - 1)) *
                360
                : 0,
          }}
          transition={{ duration: 0.5, ease: "linear" }}
        >
          <motion.div
            className="absolute top-1/2 -mt-1 w-2 h-2 rounded-full bg-pumpkin-orange"
            style={{
              left: currentRadius - 4,
            }}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          ></motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// From src/components/Visualization.tsx
const TRACK_WIDTH = 800;

interface VisualizationProps {
  visualizationType: "linear" | "circular";
  requests: number[];
  animatedSequence: number[];
  NUM_TRACKS: number;
}

function Visualization({
  visualizationType,
  requests,
  animatedSequence,
  NUM_TRACKS,
}: VisualizationProps) {
  const getPosition = (track: number) =>
    (track / (NUM_TRACKS - 1)) * TRACK_WIDTH;

  const headPosition =
    animatedSequence.length > 0
      ? animatedSequence[animatedSequence.length - 1]
      : 0;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl h-full">
      <h2 className="text-3xl font-bold text-purple mb-6 text-center">
        {visualizationType === "linear"
          ? "Linear Head Movement"
          : "Circular Head Movement"}
      </h2>
      {visualizationType === "linear" ? (
        <>
          <div
            className="relative h-48"
            style={{ width: TRACK_WIDTH, margin: "0 auto" }}
          >
            {/* Disk Track */}
            <div className="absolute top-1/2 h-1 bg-gray-300 w-full rounded-full" />

            {/* Track Markers */}
            <div
              className="absolute top-1/2 -mt-3 text-xs text-text/70"
              style={{ left: getPosition(0) - 5 }}
            >
              0
            </div>
            <div
              className="absolute top-1/2 -mt-3 text-xs text-text/70"
              style={{ left: getPosition(NUM_TRACKS - 1) - 10 }}
            >
              {NUM_TRACKS - 1}
            </div>

            {/* Request Points */}
            {requests.map((req) => (
              <div
                key={`req-${req}`}
                className="absolute top-1/2 -mt-1 w-2 h-2 bg-pumpkin-orange rounded-full"
                style={{ left: getPosition(req) - 4 }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs">
                  {req}
                </span>
              </div>
            ))}

            {/* Animated Head */}
            {animatedSequence.length > 0 && (
              <motion.div
                className="absolute top-1/2"
                style={{
                  transform: "translateX(-50%)",
                }}
                initial={{ x: getPosition(animatedSequence[0]) - 5 }}
                animate={{
                  x: getPosition(headPosition) - 5,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              >
                <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-purple" />
                <div className="w-1 h-16 bg-purple mx-auto" />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-sm font-bold text-purple">
                  {headPosition}
                </div>
              </motion.div>
            )}
          </div>
          <MovementGraph sequence={animatedSequence} />
        </>
      ) : (
        <GramophoneDisc
          requests={requests}
          animatedSequence={animatedSequence}
        />
      )}
    </div>
  );
}

// From src/components/Results.tsx
interface ResultsProps {
  sequence: number[];
  totalHeadMovement: number;
}

function Results({ sequence, totalHeadMovement }: ResultsProps) {
  if (sequence.length === 0) {
    return null;
  }

  return (
    <>
      <p className="text-center text-lg">
        <span className="font-bold text-purple">Total Head Movement:</span>{" "}
        {totalHeadMovement}
      </p>
      <p className="text-center text-md mt-2 wrap-break-word">
        <span className="font-bold text-purple">Processing Sequence:</span>{" "}
        {sequence.join(" → ")}
      </p>
    </>
  );
}

// From src/components/AnimationControls.tsx
interface AnimationControlsProps {
  play: () => void;
  pause: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isPlaying: boolean;
  isFinished: boolean;
}

function AnimationControls({
  play,
  pause,
  nextStep,
  prevStep,
  isPlaying,
  isFinished,
}: AnimationControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={prevStep}
        className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous Step"
      >
        <SkipBack className="w-6 h-6 text-gray-700" />
      </button>

      {isPlaying ? (
        <button
          onClick={pause}
          className="p-4 rounded-full bg-purple text-white hover:bg-purple/90 transition-colors"
          aria-label="Pause"
        >
          <Pause className="w-8 h-8" />
        </button>
      ) : (
        <button
          onClick={play}
          disabled={isFinished}
          className="p-4 rounded-full bg-purple text-white hover:bg-purple/90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          aria-label="Play"
        >
          <Play className="w-8 h-8" />
        </button>
      )}

      <button
        onClick={nextStep}
        className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next Step"
      >
        <SkipForward className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
}

// Main component
function DiskScheduler() {
  const {
    algorithm,
    setAlgorithm,
    currentPos,
    setCurrentPos,
    prevPos,
    setPrevPos,
    requestQueue,
    setRequestQueue,
    sequence,
    totalHeadMovement,
    animatedSequence,
    direction,
    setDirection,
    requests,
    calculateSequence,
    NUM_TRACKS,
    isPlaying,
    play,
    pause,
    nextStep,
    prevStep,
    currentStep,
  } = useDiskScheduler();

  return (
    <div className="container mx-auto p-8 font-sans bg-background text-text min-h-screen">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-purple mb-2">
          Disk Scheduling Visualizer
        </h1>
        <h1 className="text-3xl font-bold text-purple mb-2 mt-4">
          Operating Systems (BCSE303L)
          <br/>
          Dr. Naveenkumar J (C2+TC2)
          <br/>
          <br/>
          Submitted by: Ishan Jindal (23BCE0710)
        </h1>
      </header>

      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-3xl font-bold text-purple mb-6">Configuration</h2>
        <Controls
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}
          direction={direction}
          setDirection={setDirection}
          currentPos={currentPos}
          setCurrentPos={setCurrentPos}
          prevPos={prevPos}
          setPrevPos={setPrevPos}
          requestQueue={requestQueue}
          setRequestQueue={setRequestQueue}
          calculateSequence={calculateSequence}
          NUM_TRACKS={NUM_TRACKS}
        />
      </div>

      {sequence.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-3xl font-bold text-purple mb-6 text-center">
              Animation Controls
            </h2>
            <AnimationControls
              play={play}
              pause={pause}
              nextStep={nextStep}
              prevStep={prevStep}
              isPlaying={isPlaying}
              isFinished={currentStep >= sequence.length}
            />
          </div>

          <div className="flex flex-col gap-8">
            <Visualization
              visualizationType="linear"
              requests={requests}
              animatedSequence={animatedSequence}
              NUM_TRACKS={NUM_TRACKS}
            />
            <Visualization
              visualizationType="circular"
              requests={requests}
              animatedSequence={animatedSequence}
              NUM_TRACKS={NUM_TRACKS}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
            <h2 className="text-3xl font-bold text-purple mb-6 text-center">
              Results
            </h2>
            <Results
              sequence={sequence}
              totalHeadMovement={totalHeadMovement}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <DiskScheduler />
    </main>
  );
}
