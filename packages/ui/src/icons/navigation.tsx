import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

export function Search(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></CliniqIcon>;
}

export function Home(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></CliniqIcon>;
}

export function Settings(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></CliniqIcon>;
}

export function User(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></CliniqIcon>;
}

export function Users(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></CliniqIcon>;
}

export function Bell(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></CliniqIcon>;
}

export function Eye(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></CliniqIcon>;
}

export function EyeOff(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></CliniqIcon>;
}

export function Globe(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></CliniqIcon>;
}

export function LogOut(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></CliniqIcon>;
}

export function ChevronRight(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="9 18 15 12 9 6"/></CliniqIcon>;
}

export function ChevronDown(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="6 9 12 15 18 9"/></CliniqIcon>;
}

export function ChevronUp(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="18 15 12 9 6 15"/></CliniqIcon>;
}

export function ArrowLeft(p: CliniqIconProps) {
  return <CliniqIcon {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></CliniqIcon>;
}

export function Moon(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></CliniqIcon>;
}

export function Sun(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></CliniqIcon>;
}

export function Monitor(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></CliniqIcon>;
}
