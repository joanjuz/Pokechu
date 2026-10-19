export const revealAngle = (attempts: number, resolved: boolean): number => resolved ? 360 : [120,210,300][Math.max(0,Math.min(2,attempts))];
