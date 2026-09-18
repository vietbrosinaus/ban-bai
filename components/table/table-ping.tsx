import * as React from "react";

function TablePing({ x, y, colour, name }: { x: number; y: number; colour: string; name: string }) {
  return (
    <div data-slot="table-ping" className="pointer-events-none absolute z-40" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
      {[0, 220].map((delay) => (
        <span
          key={delay}
          className="absolute size-20 rounded-full border-4"
          style={{ borderColor: colour, animation: `table-ping 1100ms ease-out ${delay}ms both` }}
        />
      ))}
      <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: colour }} />
      <span
        className="absolute top-3 left-3 rounded-full px-2 py-px text-[0.6rem] font-bold whitespace-nowrap text-[#10201a]"
        style={{ background: colour }}
      >
        {name}
      </span>
    </div>
  );
}

export { TablePing };
