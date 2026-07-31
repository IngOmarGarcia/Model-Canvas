import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';
import { LlmSettingsForm } from '@/components/settings/llm-settings-form';
import { ThemePreview } from '@/components/theme/theme-preview';
import { getLlmSettings } from '@/server/services/llm-settings.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Configuración' };

export default async function SettingsPage() {
  const user = await requireRole('facilitator');
  const settings = await getLlmSettings(user);

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Organización, apariencia y proveedor de inteligencia artificial."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Inteligencia artificial</h2>
        <LlmSettingsForm settings={settings} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Apariencia</h2>
        <ThemePreview />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Organización</h2>
        <PhasePlaceholder
          phase={6}
          items={[
            'Nombre de la organización y de la capacitación',
            'Logotipo opcional',
            'Tema visual por defecto de la organización',
          ]}
        />
      </section>
    </>
  );
}
