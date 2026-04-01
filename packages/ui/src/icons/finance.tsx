import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

export function Coins(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="M16.71 13.88l.7.71-2.82 2.82"/></CliniqIcon>;
}

export function Gem(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polygon points="12 2 2 7 12 22 22 7"/></CliniqIcon>;
}

export function CreditCard(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></CliniqIcon>;
}

export function Gift(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></CliniqIcon>;
}

export function Key(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 0-7.78 7.78 5.5 5.5 0 0 0 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></CliniqIcon>;
}

export function Star(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></CliniqIcon>;
}

export function Briefcase(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="2" y1="13" x2="22" y2="13"/></CliniqIcon>;
}
