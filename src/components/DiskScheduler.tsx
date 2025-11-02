"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Algorithm = "FCFS" | "SSTF" | "SCAN" | "CSCAN" | "LOOK" | "CLOOK";

const TRACK_WIDTH = 800;
const NUM_TRACKS = 200;

export default function DiskScheduler() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [currentPos, setCurrentPos] = useState<string>("132");
  const [prevPos, setPrevPos] = useState<string>("120");
  const [requestQueue, setRequestQueue] = useState<string>("38, 55, 86, 123, 147, 91, 177, 115,  94, 150, 100, 175, 130, 185");
  
  const [sequence, setSequence] = useState<number[]>([]);
  const [totalHeadMovement, setTotalHeadMovement] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedSequence, setAnimatedSequence] = useState<number[]>([]);
  const [direction, setDirection] = useState<"up" | "down">("up");

  const requests = useMemo(() => {
    return requestQueue
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((n) => !isNaN(n) && n >= 0 && n < NUM_TRACKS);
  }, [requestQueue]);

  const calculateSequence = () => {
    const startPos = parseInt(currentPos, 10);
    if (isNaN(startPos)) return;

    let newSequence: number[] = [startPos];
    let newTotalHeadMovement = 0;
    let remainingRequests = [...requests];
    remainingRequests.sort((a, b) => a - b);

    if (algorithm === "FCFS") {
      remainingRequests = requests.slice();
      let lastPos = startPos;
      for (const req of remainingRequests) {
        newTotalHeadMovement += Math.abs(req - lastPos);
        lastPos = req;
        newSequence.push(req);
      }
    } else if (algorithm === "SSTF") {
      let current = startPos;
      const unsortedRequests = requests.slice();
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
          newTotalHeadMovement += Math.abs(nextRequest - current);
          current = nextRequest;
          newSequence.push(current);
          unsortedRequests.splice(closestIndex, 1);
        }
      }
    } else if (["SCAN", "CSCAN", "LOOK", "CLOOK"].includes(algorithm)) {
      let left = remainingRequests.filter(r => r < startPos).sort((a, b) => b - a);
      let right = remainingRequests.filter(r => r >= startPos).sort((a, b) => a - b);
      // let current = startPos;

      if (direction === 'up') {
        newSequence.push(...right);
        if (algorithm === 'SCAN' || algorithm === 'CSCAN') {
          if (right.length === 0 || right[right.length - 1] !== NUM_TRACKS - 1) {
            if (algorithm === 'CSCAN' && left.length > 0) newSequence.push(NUM_TRACKS - 1);
            else if (algorithm === 'SCAN' && left.length > 0) newSequence.push(NUM_TRACKS - 1);
          }
        }
        if (algorithm === 'CSCAN' || algorithm === 'CLOOK') {
          if (left.length > 0) {
            if (algorithm === 'CSCAN') newSequence.push(0);
            newSequence.push(...left.reverse());
          }
        } else { // SCAN or LOOK
          newSequence.push(...left);
        }
      } else { // direction 'down'
        newSequence.push(...left);
        if (algorithm === 'SCAN' || algorithm === 'CSCAN') {
          if (left.length === 0 || left[left.length - 1] !== 0) {
            if (algorithm === 'CSCAN' && right.length > 0) newSequence.push(0);
            else if (algorithm === 'SCAN' && right.length > 0) newSequence.push(0);
          }
        }
        if (algorithm === 'CSCAN' || algorithm === 'CLOOK') {
          if (right.length > 0) {
            if (algorithm === 'CSCAN') newSequence.push(NUM_TRACKS - 1);
            newSequence.push(...right.reverse());
          }
        } else { // SCAN or LOOK
          newSequence.push(...right);
        }
      }

      for (let i = 0; i < newSequence.length - 1; i++) {
        newTotalHeadMovement += Math.abs(newSequence[i + 1] - newSequence[i]);
      }
    }

    setSequence(newSequence);
    setTotalHeadMovement(newTotalHeadMovement);
    animateMovement(newSequence);
  };

  const animateMovement = (seq: number[]) => {
    if (seq.length === 0) return;
    setIsAnimating(true);
    setAnimatedSequence([]);
    let i = 0;
    const interval = setInterval(() => {
      setAnimatedSequence((prev) => [...prev, seq[i]]);
      i++;
      if (i >= seq.length) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 500);
  };

  const getPosition = (track: number) => (track / (NUM_TRACKS - 1)) * TRACK_WIDTH;

  return (
    <div className="container mx-auto p-8 font-sans bg-background text-text min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-purple">
        Disk Scheduling Algorithm Visualization
      </h1>
      <h2 className="text-2xl font-bold text-center mb-8 text-purple">
        Operating Systems (BCSE303L)
        <br/>
        Dr. Naveenkumar J (C2+TC2)
        <br /><br/>
        Submitted by: Ishan Jindal (23BCE0710)
      </h2>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-6 bg-white rounded-lg shadow-lg">
        <div>
          <label htmlFor="algorithm" className="block text-sm font-medium text-text/80 mb-1">
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
          <label htmlFor="direction" className="block text-sm font-medium text-text/80 mb-1">
            Direction
          </label>
          <select
            id="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'up' | 'down')}
            className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
          >
            <option value="up">Up (towards 199)</option>
            <option value="down">Down (towards 0)</option>
          </select>
        </div>
        <div>
          <label htmlFor="currentPos" className="block text-sm font-medium text-text/80 mb-1">
            Current Position
          </label>
          <input
            type="number"
            id="currentPos"
            value={currentPos}
            onChange={(e) => setCurrentPos(e.target.value)}
            className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
            min="0"
            max={NUM_TRACKS - 1}
          />
        </div>
        <div>
          <label htmlFor="prevPos" className="block text-sm font-medium text-text/80 mb-1">
            Previous Position
          </label>
          <input
            type="number"
            id="prevPos"
            value={prevPos}
            onChange={(e) => setPrevPos(e.target.value)}
            className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-purple focus:border-purple"
            min="0"
            max={NUM_TRACKS - 1}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <label htmlFor="requestQueue" className="block text-sm font-medium text-text/80 mb-1">
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
        <div className="md:col-span-2 lg:col-span-4 flex justify-center">
          <button
            onClick={calculateSequence}
            disabled={isAnimating}
            className="px-8 py-3 bg-purple hover:bg-purple/80 text-white font-bold rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAnimating ? "Animating..." : "Start Simulation"}
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-6 text-center">Disk Head Movement</h2>
        <div className="relative h-48" style={{ width: TRACK_WIDTH, margin: '0 auto' }}>
          {/* Disk Track */}
          <div className="absolute top-1/2 h-1 bg-gray-300 w-full rounded-full" />

          {/* Track Markers */}
          <div className="absolute top-1/2 -mt-3 text-xs text-text/70" style={{ left: getPosition(0) - 5 }}>0</div>
          <div className="absolute top-1/2 -mt-3 text-xs text-text/70" style={{ left: getPosition(NUM_TRACKS - 1) - 10 }}>{NUM_TRACKS - 1}</div>

          {/* Request Points */}
          {requests.map((req) => (
            <div
              key={`req-${req}`}
              className="absolute top-1/2 -mt-1 w-2 h-2 bg-pumpkin-orange rounded-full"
              style={{ left: getPosition(req) - 4 }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs">{req}</span>
            </div>
          ))}

          {/* Animated Head */}
          <AnimatePresence>
            {animatedSequence.length > 0 && (
              <motion.div
                className="absolute top-1/2"
                style={{ transform: "translateX(-50%)" }}
                initial={{ x: getPosition(animatedSequence[0])-5 }}
                animate={{
                  x: getPosition(animatedSequence[animatedSequence.length - 1])-5,
                }}
                transition={{ duration: 0.2, ease: [0.42, 0, 0.58, 1] }}
              >
                <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-purple" />
                <div className="w-1 h-16 bg-purple mx-auto" />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-sm font-bold text-purple">
                  {animatedSequence[animatedSequence.length - 1]}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      {sequence.length > 0 && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">Results</h2>
          <p className="text-center text-lg">
            <span className="font-bold text-purple">Total Head Movement:</span> {totalHeadMovement}
          </p>
          <p className="text-center text-md mt-2 wrap-break-word">
            <span className="font-bold text-purple">Processing Sequence:</span> {sequence.join(" → ")}
          </p>
        </div>
      )}
    </div>
  );
}
