export const ROSCO_SECONDS = 190;
export const remainingSeconds = (deadline: number, now: number): number => Math.max(0, Math.min(ROSCO_SECONDS, Math.ceil((deadline - now) / 1000)));
