import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

export function Stethoscope(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M6 2v1"/><path d="M18 2v1"/><path d="M6 3a2 2 0 0 0-2 2v2a8 8 0 0 0 8 8 8 8 0 0 0 8-8V5a2 2 0 0 0-2-2"/><line x1="18" y1="7" x2="18" y2="14"/><circle cx="18" cy="17" r="3"/></CliniqIcon>;
}

export function Pill(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M10.5 1.5l-8 8a4.95 4.95 0 1 0 7 7l8-8a4.95 4.95 0 0 0-7-7z"/><line x1="8" y1="11" x2="13" y2="6"/></CliniqIcon>;
}

export function Brain(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M9.5 2a3 3 0 0 0-2.83 4 3.5 3.5 0 0 0 .46 6.58A3 3 0 0 0 9.5 18H12V2z"/><path d="M14.5 2a3 3 0 0 1 2.83 4 3.5 3.5 0 0 1-.46 6.58A3 3 0 0 1 14.5 18H12V2z"/></CliniqIcon>;
}

export function Bone(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M18.5 5.5a3.5 3.5 0 0 0-5 0L5.5 13.5a3.5 3.5 0 1 0 5 5l8-8a3.5 3.5 0 0 0 0-5z"/></CliniqIcon>;
}

export function TestTube(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M9 2v17.5A2.5 2.5 0 0 0 11.5 22h1a2.5 2.5 0 0 0 2.5-2.5V2"/><path d="M7 2h10"/><path d="M9 16h6"/></CliniqIcon>;
}

export function Hospital(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 8a5 5 0 0 0-5 5 5 5 0 0 0 5 5 6 6 0 0 1-6-6 6 6 0 0 1 6-6z" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1" fill="currentColor" stroke="none"/></CliniqIcon>;
}

export function Microscope(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0-4-12.9"/><path d="M9 14h2"/><circle cx="9" cy="7" r="4"/><path d="M12 4.5V2"/></CliniqIcon>;
}

export function Skincare(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="7" y="10" width="10" height="11" rx="2"/><path d="M10 10V7a2 2 0 0 1 4 0v3"/><path d="M10 4h4"/></CliniqIcon>;
}

export function Nutrition(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/><path d="M12 8v8"/><path d="M9 15l3-3 3 3"/></CliniqIcon>;
}

export function Baby(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="9" r="5"/><path d="M7.3 14.7C8.6 16.7 10.2 18 12 18s3.4-1.3 4.7-3.3"/><circle cx="10" cy="9.5" r=".5" fill="currentColor" stroke="none"/><circle cx="14" cy="9.5" r=".5" fill="currentColor" stroke="none"/></CliniqIcon>;
}

export function Doctor(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><path d="M12 11v3"/><path d="M10.5 12.5h3"/></CliniqIcon>;
}

export function Bot(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="4" y="7" width="16" height="14" rx="3"/><circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/><path d="M9 18h6"/><path d="M3 5c0 0 2-3 9-3s9 3 9 3"/><path d="M3 5c-1 3-1 6 0 7"/><path d="M21 5c1 3 1 6 0 7"/><line x1="3" y1="5" x2="21" y2="5" strokeWidth={2.5}/></CliniqIcon>;
}
