export const CONSULTATION_DRAWER_EVENT = "magnolia:open-consultation-drawer";

export interface ConsultationDrawerDetail {
  pillar?: string;
}

export function openConsultationDrawer(pillar?: string) {
  window.dispatchEvent(
    new CustomEvent<ConsultationDrawerDetail>(CONSULTATION_DRAWER_EVENT, {
      detail: { pillar },
    })
  );
}
