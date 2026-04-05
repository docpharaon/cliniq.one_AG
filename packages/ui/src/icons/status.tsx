import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

export function CheckCircle(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></CliniqIcon>;
}

export function XCircle(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></CliniqIcon>;
}

export function AlertTriangle(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></CliniqIcon>;
}

export function Clock(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></CliniqIcon>;
}

export function Lock(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></CliniqIcon>;
}

export function Shield(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></CliniqIcon>;
}

export function Ban(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></CliniqIcon>;
}

export function Siren(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></CliniqIcon>;
}

export function Info(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></CliniqIcon>;
}

export function Zap(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></CliniqIcon>;
}

export function FireTruck(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="1" y="10" width="14" height="8" rx="2"/><path d="M15 14h5l3 3v1h-8"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6 4l2 6"/><path d="M10 4l-2 6"/><path d="M4 7h8"/></CliniqIcon>;
}

export function Flag(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></CliniqIcon>;
}

export function Check(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="20 6 9 17 4 12"/></CliniqIcon>;
}
