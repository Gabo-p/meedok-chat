import { createStreamTimeouts } from '../stream-timeout';

describe('createStreamTimeouts', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('creates two independent AbortControllers', () => {
    const handles = createStreamTimeouts(5_000, 120_000);
    expect(handles.firstChunkController).toBeInstanceOf(AbortController);
    expect(handles.totalStreamController).toBeInstanceOf(AbortController);
    expect(handles.firstChunkController).not.toBe(handles.totalStreamController);
    handles.clearAll();
  });

  it('aborts firstChunkController after firstChunkMs', () => {
    const handles = createStreamTimeouts(5_000, 120_000);
    expect(handles.firstChunkController.signal.aborted).toBe(false);

    jest.advanceTimersByTime(5_001);
    expect(handles.firstChunkController.signal.aborted).toBe(true);
    expect(handles.totalStreamController.signal.aborted).toBe(false);

    handles.clearAll();
  });

  it('aborts totalStreamController after totalMs', () => {
    const handles = createStreamTimeouts(5_000, 120_000);
    jest.advanceTimersByTime(5_001);
    handles.clearFirstChunkTimer(); // simulate first chunk arrived
    jest.advanceTimersByTime(115_000);
    expect(handles.totalStreamController.signal.aborted).toBe(true);
    handles.clearAll();
  });

  it('clearFirstChunkTimer prevents first-chunk abort', () => {
    const handles = createStreamTimeouts(5_000, 120_000);
    handles.clearFirstChunkTimer();
    jest.advanceTimersByTime(10_000);
    expect(handles.firstChunkController.signal.aborted).toBe(false);
    handles.clearAll();
  });

  it('clearAll prevents both aborts', () => {
    const handles = createStreamTimeouts(5_000, 120_000);
    handles.clearAll();
    jest.advanceTimersByTime(200_000);
    expect(handles.firstChunkController.signal.aborted).toBe(false);
    expect(handles.totalStreamController.signal.aborted).toBe(false);
  });
});
