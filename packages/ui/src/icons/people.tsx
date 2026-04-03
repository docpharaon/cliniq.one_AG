import { CliniqIcon } from './CliniqIcon';
import type { CliniqIconProps } from './types';

/** Mars symbol – male */
export function GenderMale(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="10" cy="14" r="5"/><path d="M17 3h4v4"/><path d="M21 3l-6.3 6.3"/></CliniqIcon>;
}

/** Venus symbol – female */
export function GenderFemale(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="9" r="5"/><path d="M12 14v7"/><path d="M9 18h6"/></CliniqIcon>;
}

/** Combined / non-binary symbol */
export function GenderDiverse(p: CliniqIconProps) {
  return <CliniqIcon {...p}><circle cx="12" cy="12" r="5"/><path d="M12 7V2"/><path d="M15 3l-3 2-3-2"/><path d="M12 17v4"/><path d="M10 20h4"/></CliniqIcon>;
}

/** Police officer badge */
export function Police(p: CliniqIconProps) {
  return <CliniqIcon {...p}><path d="M12 2l3 4h4l-1 4 3 3-3 3 1 4h-4l-3 4-3-4H5l1-4-3-3 3-3-1-4h4l3-4z"/><circle cx="12" cy="13" r="2"/></CliniqIcon>;
}
