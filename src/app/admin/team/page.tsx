'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

type LocalizedText = { et: string; en: string };
type LocalizedList = { et: string[]; en: string[] };

interface TeamMember {
  id: string;
  slug: string;
  fullName: LocalizedText;
  roleTitle: LocalizedText;
  shortIntro: LocalizedText;
  mainImage: string;
  badge1Text: LocalizedText;
  badge2Text: LocalizedText;
  badge3Text: LocalizedText;
  feature1Title: LocalizedText;
  feature1Text: LocalizedText;
  feature2Title: LocalizedText;
  feature2Text: LocalizedText;
  feature3Title: LocalizedText;
  feature3Text: LocalizedText;
  signatureLabel: LocalizedText;
  signatureTags: LocalizedList;
  previewGalleryImages: string[];
  primaryCtaText: LocalizedText;
  primaryCtaLink: string;
  availabilityHelperText: LocalizedText;
  isVisible: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface TeamDraft {
  slug: string;
  fullName: LocalizedText;
  roleTitle: LocalizedText;
  shortIntro: LocalizedText;
  mainImage: string;
  badge1Text: LocalizedText;
  badge2Text: LocalizedText;
  badge3Text: LocalizedText;
  feature1Title: LocalizedText;
  feature1Text: LocalizedText;
  feature2Title: LocalizedText;
  feature2Text: LocalizedText;
  feature3Title: LocalizedText;
  feature3Text: LocalizedText;
  signatureLabel: LocalizedText;
  signatureTagsEt: string;
  signatureTagsEn: string;
  previewGalleryImagesText: string;
  primaryCtaText: LocalizedText;
  primaryCtaLink: string;
  availabilityHelperText: LocalizedText;
  isVisible: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
}

function toListText(items: string[]): string {
  return items.join('\n');
}

function fromListText(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDraft(member: TeamMember): TeamDraft {
  return {
    slug: member.slug,
    fullName: member.fullName,
    roleTitle: member.roleTitle,
    shortIntro: member.shortIntro,
    mainImage: member.mainImage,
    badge1Text: member.badge1Text,
    badge2Text: member.badge2Text,
    badge3Text: member.badge3Text,
    feature1Title: member.feature1Title,
    feature1Text: member.feature1Text,
    feature2Title: member.feature2Title,
    feature2Text: member.feature2Text,
    feature3Title: member.feature3Title,
    feature3Text: member.feature3Text,
    signatureLabel: member.signatureLabel,
    signatureTagsEt: toListText(member.signatureTags.et),
    signatureTagsEn: toListText(member.signatureTags.en),
    previewGalleryImagesText: toListText(member.previewGalleryImages),
    primaryCtaText: member.primaryCtaText,
    primaryCtaLink: member.primaryCtaLink,
    availabilityHelperText: member.availabilityHelperText,
    isVisible: member.isVisible,
    showOnHomepage: member.showOnHomepage,
    isFeatured: member.isFeatured,
  };
}

function localizedInput(
  label: string,
  value: LocalizedText,
  onChange: (value: LocalizedText) => void,
  locale: 'et' | 'en',
  multiline = false
) {
  const common = 'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800';
  const activeValue = locale === 'et' ? value.et : value.en;
  return (
    <div className="grid gap-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{label} ({locale.toUpperCase()})</span>
        {multiline ? (
          <textarea
            rows={3}
            value={activeValue}
            onChange={(event) => onChange(locale === 'et' ? { ...value, et: event.target.value } : { ...value, en: event.target.value })}
            className={common}
          />
        ) : (
          <input value={activeValue} onChange={(event) => onChange(locale === 'et' ? { ...value, et: event.target.value } : { ...value, en: event.target.value })} className={common} />
        )}
      </label>
    </div>
  );
}

export default function AdminTeamPage() {
  const [editorLanguage, setEditorLanguage] = useState<'et' | 'en'>('et');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TeamDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState<LocalizedText>({ et: '', en: '' });
  const [newMemberRole, setNewMemberRole] = useState<LocalizedText>({ et: '', en: '' });

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/team?admin=1', { cache: 'no-store' });
      const data = (await response.json()) as { members?: TeamMember[] };
      const next = Array.isArray(data.members) ? data.members : [];
      setMembers(next);
      setDrafts(
        next.reduce<Record<string, TeamDraft>>((acc, member) => {
          acc[member.id] = toDraft(member);
          return acc;
        }, {})
      );
    } catch {
      setError('Tiimiliikmete laadimine ebaõnnestus.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const setDraft = (id: string, patch: Partial<TeamDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const createMember = async () => {
    if (!newMemberName.et.trim()) {
      setError('Nimi ET on kohustuslik.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: {
            et: newMemberName.et.trim(),
            en: newMemberName.en.trim() || newMemberName.et.trim(),
          },
          roleTitle: {
            et: newMemberRole.et.trim(),
            en: newMemberRole.en.trim() || newMemberRole.et.trim(),
          },
        }),
      });
      if (!response.ok) throw new Error('Create failed');
      setNewMemberName({ et: '', en: '' });
      setNewMemberRole({ et: '', en: '' });
      await loadMembers();
    } catch {
      setError('Spetsialisti lisamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveMember = async (id: string) => {
    const draft = drafts[id];
    if (!draft || !draft.fullName.et.trim()) {
      setError('Nimi ET on kohustuslik.');
      return;
    }
    try {
      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          slug: draft.slug.trim(),
          fullName: draft.fullName,
          roleTitle: draft.roleTitle,
          shortIntro: draft.shortIntro,
          mainImage: draft.mainImage.trim(),
          badge1Text: draft.badge1Text,
          badge2Text: draft.badge2Text,
          badge3Text: draft.badge3Text,
          feature1Title: draft.feature1Title,
          feature1Text: draft.feature1Text,
          feature2Title: draft.feature2Title,
          feature2Text: draft.feature2Text,
          feature3Title: draft.feature3Title,
          feature3Text: draft.feature3Text,
          signatureLabel: draft.signatureLabel,
          signatureTags: { et: fromListText(draft.signatureTagsEt), en: fromListText(draft.signatureTagsEn) },
          previewGalleryImages: fromListText(draft.previewGalleryImagesText),
          primaryCtaText: draft.primaryCtaText,
          primaryCtaLink: draft.primaryCtaLink.trim(),
          availabilityHelperText: draft.availabilityHelperText,
          isVisible: draft.isVisible,
          showOnHomepage: draft.showOnHomepage,
          isFeatured: draft.isFeatured,
        }),
      });
      if (!response.ok) throw new Error('Save failed');
      await loadMembers();
      setEditingId(null);
    } catch {
      setError('Spetsialisti salvestamine ebaõnnestus.');
    }
  };

  const moveMember = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= members.length) return;
    const reordered = [...members];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setMembers(reordered);
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) }),
    });
    await loadMembers();
  };

  const deleteMember = async (id: string, label: string) => {
    if (!window.confirm(`Kas kustutada "${label}"?`)) return;
    const response = await fetch(`/api/team?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Kustutamine ebaõnnestus.');
      return;
    }
    await loadMembers();
  };

  return (
    <main>
      <div className="space-y-6">
        <AdminPageHeader
          overline="Sisu"
          title="Tiim (kakskeelne)"
          subtitle="Halda tiimi sisu Eesti ja Inglise vaates eraldi."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>}
        <div className="inline-flex rounded-full border border-[#e7d6e1] bg-white p-1">
          <button
            type="button"
            onClick={() => setEditorLanguage('et')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${editorLanguage === 'et' ? 'bg-[#fbeef5] text-[#7f375d]' : 'text-[#786674]'}`}
          >
            Eesti
          </button>
          <button
            type="button"
            onClick={() => setEditorLanguage('en')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${editorLanguage === 'en' ? 'bg-[#fbeef5] text-[#7f375d]' : 'text-[#786674]'}`}
          >
            Inglise
          </button>
        </div>

        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Lisa uus spetsialist</p>
          <div className="grid gap-3">
            <input
              value={editorLanguage === 'et' ? newMemberName.et : newMemberName.en}
              onChange={(event) =>
                setNewMemberName((prev) =>
                  editorLanguage === 'et' ? { ...prev, et: event.target.value } : { ...prev, en: event.target.value }
                )
              }
              placeholder={editorLanguage === 'et' ? 'Nimi' : 'Name'}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm"
            />
            <input
              value={editorLanguage === 'et' ? newMemberRole.et : newMemberRole.en}
              onChange={(event) =>
                setNewMemberRole((prev) =>
                  editorLanguage === 'et' ? { ...prev, et: event.target.value } : { ...prev, en: event.target.value }
                )
              }
              placeholder={editorLanguage === 'et' ? 'Roll' : 'Role'}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm"
            />
          </div>
          <button type="button" onClick={createMember} disabled={isSaving} className="mt-3 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {isSaving ? 'Salvestan...' : 'Lisa spetsialist'}
          </button>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          {isLoading ? (
            <p className="py-8 text-sm text-slate-500">Laen tiimi andmeid...</p>
          ) : (
            <div className="space-y-4">
              {members.map((member, index) => {
                const draft = drafts[member.id];
                if (!draft) return null;
                const isEditing = editingId === member.id;
                return (
                  <article key={member.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{draft.fullName.et || 'Nimetu spetsialist'}</p>
                      <button type="button" onClick={() => setEditingId((current) => (current === member.id ? null : member.id))} className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-xs">
                        {isEditing ? 'Sulge' : 'Muuda'}
                      </button>
                      <button type="button" onClick={() => moveMember(index, -1)} className="rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs">Üles</button>
                      <button type="button" onClick={() => moveMember(index, 1)} className="rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs">Alla</button>
                      <button type="button" onClick={() => void deleteMember(member.id, draft.fullName.et || draft.fullName.en)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600">
                        Kustuta
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Slug</span>
                          <input value={draft.slug} onChange={(event) => setDraft(member.id, { slug: event.target.value })} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
                        </label>
                        {localizedInput('Nimi', draft.fullName, (value) => setDraft(member.id, { fullName: value }), editorLanguage)}
                        {localizedInput('Roll', draft.roleTitle, (value) => setDraft(member.id, { roleTitle: value }), editorLanguage)}
                        {localizedInput('Lühikirjeldus', draft.shortIntro, (value) => setDraft(member.id, { shortIntro: value }), editorLanguage, true)}
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Põhipildi URL</span>
                          <input value={draft.mainImage} onChange={(event) => setDraft(member.id, { mainImage: event.target.value })} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
                        </label>
                        {localizedInput('Tunnus 1', draft.badge1Text, (value) => setDraft(member.id, { badge1Text: value }), editorLanguage)}
                        {localizedInput('Tunnus 2', draft.badge2Text, (value) => setDraft(member.id, { badge2Text: value }), editorLanguage)}
                        {localizedInput('Tunnus 3', draft.badge3Text, (value) => setDraft(member.id, { badge3Text: value }), editorLanguage)}
                        {localizedInput('Fookus 1 pealkiri', draft.feature1Title, (value) => setDraft(member.id, { feature1Title: value }), editorLanguage)}
                        {localizedInput('Fookus 1 tekst', draft.feature1Text, (value) => setDraft(member.id, { feature1Text: value }), editorLanguage)}
                        {localizedInput('Fookus 2 pealkiri', draft.feature2Title, (value) => setDraft(member.id, { feature2Title: value }), editorLanguage)}
                        {localizedInput('Fookus 2 tekst', draft.feature2Text, (value) => setDraft(member.id, { feature2Text: value }), editorLanguage)}
                        {localizedInput('Fookus 3 pealkiri', draft.feature3Title, (value) => setDraft(member.id, { feature3Title: value }), editorLanguage)}
                        {localizedInput('Fookus 3 tekst', draft.feature3Text, (value) => setDraft(member.id, { feature3Text: value }), editorLanguage)}
                        {localizedInput('Signatuur pealkiri', draft.signatureLabel, (value) => setDraft(member.id, { signatureLabel: value }), editorLanguage)}
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Signatuuri märksõnad ({editorLanguage.toUpperCase()})</span>
                          <textarea rows={3} value={editorLanguage === 'et' ? draft.signatureTagsEt : draft.signatureTagsEn} onChange={(event) => setDraft(member.id, editorLanguage === 'et' ? { signatureTagsEt: event.target.value } : { signatureTagsEn: event.target.value })} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Galerii eelvaate pildid (üks URL rea kohta)</span>
                          <textarea rows={3} value={draft.previewGalleryImagesText} onChange={(event) => setDraft(member.id, { previewGalleryImagesText: event.target.value })} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
                        </label>
                        {localizedInput('Peamine CTA tekst', draft.primaryCtaText, (value) => setDraft(member.id, { primaryCtaText: value }), editorLanguage)}
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Peamise CTA link</span>
                          <input value={draft.primaryCtaLink} onChange={(event) => setDraft(member.id, { primaryCtaLink: event.target.value })} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
                        </label>
                        {localizedInput('Saadavuse abitekst', draft.availabilityHelperText, (value) => setDraft(member.id, { availabilityHelperText: value }), editorLanguage)}
                        <div className="flex flex-wrap gap-3">
                          <label className="inline-flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={draft.isVisible} onChange={(event) => setDraft(member.id, { isVisible: event.target.checked })} /> Nähtav</label>
                          <label className="inline-flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={draft.showOnHomepage} onChange={(event) => setDraft(member.id, { showOnHomepage: event.target.checked })} /> Avalehel</label>
                          <label className="inline-flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft(member.id, { isFeatured: event.target.checked })} /> Esilehel</label>
                        </div>
                        <button type="button" onClick={() => void saveMember(member.id)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
                          Salvesta
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}



