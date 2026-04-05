import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

export function Camera(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></CliniqIcon>;
}

export function Upload(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></CliniqIcon>;
}

export function Download(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></CliniqIcon>;
}

export function Save(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></CliniqIcon>;
}

export function Trash(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></CliniqIcon>;
}

export function Refresh(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></CliniqIcon>;
}

export function Sparkles(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></CliniqIcon>;
}

export function Paperclip(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></CliniqIcon>;
}

export function Edit(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></CliniqIcon>;
}

export function Send(p: CliniqIconProps) {
  return <CliniqIcon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></CliniqIcon>;
}

export function Share(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></CliniqIcon>;
}

export function Mic(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></CliniqIcon>;
}

export function Keyboard(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M8 16h8"/></CliniqIcon>;
}

export function ArrowUp(p: CliniqIconProps) {
  return <CliniqIcon {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></CliniqIcon>;
}

export function X(p: CliniqIconProps) {
  return <CliniqIcon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></CliniqIcon>;
}

export function Square(p: CliniqIconProps) {
  return <CliniqIcon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/></CliniqIcon>;
}

export function PointerFinger(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M10 4.5V4a2 2 0 1 1 4 0v.5"/><path d="M14.5 8.5V6a2 2 0 1 1 4 0v2.5"/><path d="M5.5 12V6a2 2 0 1 1 4 0v6"/><path d="M18.5 10a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.6 0-4.7-1.2-6.3-3.6L4 16.8a2 2 0 0 1 3.4-2.1l.6 1V6"/></CliniqIcon>;
}

export function RefreshCcw(p: CliniqIconProps) {
  return <CliniqIcon {...p}><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></CliniqIcon>;
}

