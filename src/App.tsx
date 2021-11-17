import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpring, a } from "@react-spring/web";
import "./App.css";
import { DraggableCore, DraggableEventHandler } from "react-draggable";

interface Position {
	x: number;
	y: number;
	z?: number;
}

interface Moveable {
	position: Position;
	color: string;
}

// Define general type for useWindowSize hook, which includes width and height
interface Size {
	width?: number;
	height?: number;
}

const colors = [
	"bg-red-500",
	"bg-blue-500",
	"bg-green-500",
	"bg-gray-500",
	"bg-yellow-500",
	"bg-indigo-500",
	"bg-purple-500",
	"bg-pink-500",
];

function App() {
	const [number, setNumber] = useState(3);
	const [moveables, setMoveables] = useState<Moveable[]>([]);
	const mousePos = useMousePosition();
	const size: Size = useWindowSize();
	const domTarget = useRef(null);

	const relMousePos = useMemo(() => {
		return {
			x: mousePos.x - (size.width ?? 0) / 2,
			y: mousePos.y - (size.height ?? 0) / 2,
		};
	}, [mousePos, size]);

	useEffect(() => {
		if (moveables.length > number) {
			setMoveables((prev) => prev.slice(0, -(number - moveables.length)));
		} else if (moveables.length < number) {
			setMoveables((prev) => [...prev, generateMoveables()]);
		}
	}, [number, moveables.length]);

	const generateMoveables = (): Moveable => {
		return {
			position: {
				x: (Math.random() - 0.5) * (size.width ?? 0) * 0.75,
				y: (Math.random() - 0.5) * (size.height ?? 0) * 0.75,
				z: Math.random() * 2 - 1,
			},
			color: colors[Math.floor(Math.random() * colors.length)],
		};
	};

	const updateQuantity = useCallback((e) => {
		setNumber(e.target.value);
	}, []);

	return (
		<div ref={domTarget} className='h-full absolute w-full flex flex-col'>
			<input
				className='mx-auto w-80'
				type='range'
				value={number}
				onChange={updateQuantity}
				max={10}
				min={1}
			/>
			<div className='overflow-hidden relative h-full w-full'>
				{moveables.map((state) => (
					<Moveable
						mousePos={relMousePos}
						screenSize={size}
						initialState={state}
					/>
				))}
			</div>
		</div>
	);
}

interface MoveableProps {
	initialState: Moveable;
	mousePos: Position;
	screenSize: Size;
}

const Moveable: React.FC<MoveableProps> = ({
	mousePos,
	screenSize,
	initialState,
}: MoveableProps) => {
	const domTarget = useRef(null);
	const [basePos, setBasePos] = useState<Position>(initialState.position);
	const [{ x, y, scale }, api] = useSpring(() => ({
		x: 0,
		y: 0,
		scale: 1,
		config: { mass: 5, tension: 350, friction: 40 },
	}));

	useEffect(() => {
		api({
			x: basePos.x - (mousePos.x / 2) * (1 + (basePos.z ?? 0)),
			y: basePos.y - (mousePos.y / 2) * (1 + (basePos.z ?? 0)),
			scale: zToScale(basePos.z),
		});
	}, [mousePos, basePos]);

	const zToScale = useCallback((z?: number): number => {
		if (!z) return 1;
		return 1 + clamp(z, -0.75, 1);
	}, []);

	const handleDrag: DraggableEventHandler = useCallback(
		(e) => {
			e.preventDefault();
			setBasePos((prev) => {
				return {
					x: (e as MouseEvent).x - (screenSize?.width ?? 0) / 2,
					y: (e as MouseEvent).y - (screenSize?.height ?? 0) / 2,
					z: prev.z,
				};
			});
		},
		[screenSize],
	);

	const handleScroll: React.WheelEventHandler = useCallback((e) => {
		e.preventDefault();
		setBasePos((prev) => {
			let newZ = clamp((prev.z ?? 0) - e.deltaY / 500, -0.95, 1);
			console.log(newZ);
			return { x: prev.x, y: prev.y, z: newZ };
		});
	}, []);

	return (
		<DraggableCore onDrag={handleDrag}>
			<a.div
				onWheel={handleScroll}
				ref={domTarget}
				className={`${initialState.color} w-40 h-40 transform absolute top-0 left-0 right-0 bottom-0 m-auto`}
				style={{
					x,
					y,
					scale,
					zIndex: Math.floor(zToScale(basePos.z) * 1000),
				}}
			/>
		</DraggableCore>
	);
};

// Hook
function useWindowSize(): Size {
	// Initialize state with undefined width/height so server and client renders match
	// Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
	const [windowSize, setWindowSize] = useState<Size>({
		width: undefined,
		height: undefined,
	});

	useEffect(() => {
		// Handler to call on window resize
		function handleResize() {
			// Set window width/height to state
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		}

		// Add event listener
		window.addEventListener("resize", handleResize);

		// Call handler right away so state gets updated with initial window size
		handleResize();

		// Remove event listener on cleanup
		return () => window.removeEventListener("resize", handleResize);
	}, []); // Empty array ensures that effect is only run on mount

	return windowSize;
}

const useMousePosition = () => {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	const updateMousePosition = (ev: MouseEvent) => {
		setMousePosition({ x: ev.clientX, y: ev.clientY });
	};

	useEffect(() => {
		window.addEventListener("mousemove", updateMousePosition);

		return () => window.removeEventListener("mousemove", updateMousePosition);
	}, []);

	return mousePosition;
};

function clamp(number: number, min: number, max: number) {
	return Math.max(min, Math.min(number, max));
}

export default App;
