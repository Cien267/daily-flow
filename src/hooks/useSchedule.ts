import { useEffect, useRef, useState } from "react";
import { ScheduleBlock, defaultSchedule } from "@/data/schedule";
import { API_ENABLED, api, silent, uid } from "@/lib/api";
import { readLocal, saveState } from "@/lib/persistence";

const KEY = "schedule.blocks.v1";

const withIds = (list: ScheduleBlock[]): ScheduleBlock[] =>
  list.map((b) => (b.id ? b : { ...b, id: uid() }));

export function useSchedule() {
  const [blocks, setBlocksState] = useState<ScheduleBlock[]>(() =>
    API_ENABLED ? [] : withIds(readLocal<ScheduleBlock[]>(KEY, defaultSchedule)),
  );
  const hydrated = useRef(!API_ENABLED);

  useEffect(() => {
    if (!API_ENABLED) return;
    let alive = true;
    api
      .get<ScheduleBlock[]>("/api/schedule-blocks")
      .then((list) => {
        if (!alive) return;
        hydrated.current = true;
        setBlocksState(withIds(list ?? []));
      })
      .catch((e) => {
        console.warn("[api] schedule", e);
        hydrated.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  const setBlocks = (next: ScheduleBlock[]) => {
    const value = withIds(next);
    setBlocksState(value);
    if (!API_ENABLED) saveState(KEY, value);
    return value;
  };

  const add = (block: ScheduleBlock) => {
    const created = { ...block, id: block.id ?? uid() };
    const next = setBlocks([...blocks, created].sort((a, b) => a.start.localeCompare(b.start)));
    if (API_ENABLED) {
      silent(api.post("/api/schedule-blocks", created));
      silent(api.put("/api/schedule-blocks/reorder", { orderedIds: next.map((b) => b.id) }));
    }
  };

  const update = (index: number, block: ScheduleBlock) => {
    const current = blocks[index];
    const merged = { ...block, id: block.id ?? current?.id ?? uid() };
    const next = [...blocks];
    next[index] = merged;
    setBlocks(next);
    if (API_ENABLED) silent(api.patch(`/api/schedule-blocks/${merged.id}`, merged));
  };

  const remove = (index: number) => {
    const target = blocks[index];
    setBlocks(blocks.filter((_, i) => i !== index));
    if (API_ENABLED && target?.id) silent(api.del(`/api/schedule-blocks/${target.id}`));
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    const value = setBlocks(next);
    if (API_ENABLED)
      silent(api.put("/api/schedule-blocks/reorder", { orderedIds: value.map((b) => b.id) }));
  };

  const reset = () => {
    if (API_ENABLED) {
      silent(
        api
          .post<ScheduleBlock[]>("/api/schedule-blocks/reset")
          .then((list) => setBlocksState(withIds(list ?? defaultSchedule))),
      );
      return;
    }
    setBlocks(defaultSchedule);
  };

  return { blocks, add, update, remove, move, reset, setBlocks };
}
