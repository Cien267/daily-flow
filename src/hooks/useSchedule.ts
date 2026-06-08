import { useLocalStorage } from "@/lib/useLocalStorage";
import { ScheduleBlock, defaultSchedule } from "@/data/schedule";

const KEY = "schedule.blocks.v1";

export function useSchedule() {
  const [blocks, setBlocks] = useLocalStorage<ScheduleBlock[]>(KEY, defaultSchedule);

  const add = (block: ScheduleBlock) => {
    setBlocks([...blocks, block].sort((a, b) => a.start.localeCompare(b.start)));
  };
  const update = (index: number, block: ScheduleBlock) => {
    const next = [...blocks];
    next[index] = block;
    setBlocks(next);
  };
  const remove = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
  };
  const reset = () => setBlocks(defaultSchedule);

  return { blocks, add, update, remove, move, reset, setBlocks };
}
