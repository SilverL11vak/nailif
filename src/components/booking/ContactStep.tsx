'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import { trackEvent, touchBookingActivity } from '@/lib/analytics-client';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type UploadKind = 'inspiration' | 'current';

function parsePhone(rawPhone?: string) {
  const value = (rawPhone ?? '').trim();
  const match = value.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { code: match[1], local: match[2] };
  }
  return { code: '', local: value };
}

export function ContactStep() {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const setContactInfo = useBookingStore((state) => state.setContactInfo);
  const nextStep = useBookingStore((state) => state.nextStep);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);

  const parsedPhone = parsePhone(contactInfo?.phone);
  const [showEmail, setShowEmail] = useState(Boolean(contactInfo?.email));
  const [dragOver, setDragOver] = useState<UploadKind | null>(null);
  const [countryCode, setCountryCode] = useState(parsedPhone.code);
  const [formData, setFormData] = useState({
    firstName: contactInfo?.firstName || '',
    lastName: contactInfo?.lastName || '',
    phone: parsedPhone.local,
    email: contactInfo?.email || '',
    notes: contactInfo?.notes || '',
    inspirationNote: contactInfo?.inspirationNote || '',
  });
  const [inspirationImage, setInspirationImage] = useState<string>(contactInfo?.inspirationImage || '');
  const [currentNailImage, setCurrentNailImage] = useState<string>(contactInfo?.currentNailImage || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const currentInputRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const countryOptions = [
    { code: '+372', label: 'Estonia' },
    { code: '+358', label: 'Finland' },
    { code: '+371', label: 'Latvia' },
    { code: '+370', label: 'Lithuania' },
    { code: '+46', label: 'Sweden' },
    { code: '+44', label: 'UK' },
    { code: '+49', label: 'Germany' },
  ];

  useEffect(() => {
    firstNameRef.current?.focus();
    touchBookingActivity();
    trackEvent({
      eventType: 'booking_details_started',
      step: 3,
      serviceId: selectedService?.id,
      slotId: selectedSlot?.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countryCode.trim()) return;
    const locale = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
    const detected =
      locale.startsWith('et') ? '+372' :
      locale.startsWith('fi') ? '+358' :
      locale.startsWith('lv') ? '+371' :
      locale.startsWith('lt') ? '+370' :
      locale.startsWith('sv') ? '+46' : '';
    const fallbackCode = detected || text('phone_default_country_code', '+372').trim();
    if (!fallbackCode) return;
    setCountryCode(fallbackCode.startsWith('+') ? fallbackCode : `+${fallbackCode.replace(/[^\d]/g, '')}`);
  }, [countryCode, text]);

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'phone' ? formatPhoneNumber(value) : value;
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleCountryCodeChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    const normalized = cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/[+]/g, '')}`;
    setCountryCode(normalized === '+' ? '' : normalized);
  };

  const setImageByKind = (kind: UploadKind, value: string) => {
    if (kind === 'inspiration') {
      setInspirationImage(value);
    } else {
      setCurrentNailImage(value);
    }
  };

  const handleImageUpload = async (kind: UploadKind, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 3 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        [kind]: text('upload_size_error', language === 'en' ? 'Image is too large (max 3 MB).' : 'Pilt on liiga suur (max 3 MB).'),
      }));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageByKind(kind, dataUrl);
      setErrors((prev) => ({ ...prev, [kind]: '' }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        [kind]: text('upload_failed_error', language === 'en' ? 'Image upload failed.' : 'Pildi lisamine ebaonnestus.'),
      }));
    } finally {
      if (kind === 'inspiration' && inspirationInputRef.current) inspirationInputRef.current.value = '';
      if (kind === 'current' && currentInputRef.current) currentInputRef.current.value = '';
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) nextErrors.firstName = t('contact.required');
    if (!formData.phone.trim()) {
      nextErrors.phone = t('contact.required');
    } else if (!countryCode || !countryCode.startsWith('+')) {
      nextErrors.phone = t('contact.validPhone');
    } else if (!/^[\d\s-]{5,}$/.test(formData.phone)) {
      nextErrors.phone = t('contact.validPhone');
    }
    if (showEmail && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = t('contact.validEmail');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      setTouched({ firstName: true, phone: true, email: true });
      return;
    }

    const fullPhone = `${countryCode} ${formData.phone}`.trim();
    setContactInfo({
      firstName: formData.firstName,
      lastName: formData.lastName || undefined,
      phone: fullPhone,
      email: formData.email || undefined,
      notes: formData.notes || undefined,
      inspirationImage: inspirationImage || undefined,
      currentNailImage: currentNailImage || undefined,
      inspirationNote: formData.inspirationNote || undefined,
    });
    nextStep();
  };

  const prepTips = [
    text('preparation_tip_1', language === 'en' ? 'Free rescheduling' : 'Tasuta ümberbroneerimine'),
    text('preparation_tip_2', language === 'en' ? 'Fast confirmation' : 'Kiire kinnitus'),
    text('preparation_tip_3', language === 'en' ? 'Certified nail technician' : 'Sertifitseeritud küünetehnik'),
  ];

  const uploadCard = (kind: UploadKind, title: string, imageValue: string, inputRef: React.RefObject<HTMLInputElement | null>) => (
    <div className="rounded-2xl border border-[#e8dce6] bg-[#fffafd] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#84667a]">{title}</p>
      {!imageValue ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(kind);
          }}
          onDragLeave={() => setDragOver((prev) => (prev === kind ? null : prev))}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(null);
            void handleImageUpload(kind, event.dataTransfer.files);
          }}
          className={`mt-2 w-full rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm font-medium transition ${
            dragOver === kind ? 'border-[#d1b3c8] bg-[#fff4fb] text-[#6d5868]' : 'border-[#e5d7e1] bg-white text-[#6d5868] hover:border-[#d1b3c8]'
          }`}
        >
          {text('upload_cta', language === 'en' ? 'Upload photo from device' : 'Lisa foto seadmest')}
        </button>
      ) : (
        <div className="mt-2 rounded-xl border border-[#e2d7cf] bg-white p-2">
          <div className="relative mb-2 h-28 w-full overflow-hidden rounded-lg">
            <Image src={imageValue} alt={language === 'en' ? 'Reference preview' : 'Eelvaade'} fill className="object-cover" unoptimized />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-[#ddd1c8] px-3 py-2 text-xs font-medium text-[#6f5d53]">
              {text('upload_replace', language === 'en' ? 'Replace photo' : 'Asenda foto')}
            </button>
            <button type="button" onClick={() => setImageByKind(kind, '')} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600">
              {text('upload_remove', language === 'en' ? 'Remove photo' : 'Eemalda foto')}
            </button>
          </div>
        </div>
      )}
      {errors[kind] && <p className="mt-1 text-xs text-red-500">{errors[kind]}</p>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center md:mb-10">
        <h2 className="font-brand text-[1.65rem] font-semibold tracking-tight text-[#2f2622] md:text-[1.85rem]">
          {t('contact.yourDetails')}
        </h2>
        <p className="mt-2 text-[15px] text-[#6f655f]">{t('contact.sendConfirmation')}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-[#eadce5] bg-[#fffafe] p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-[#4a3344]">{selectedService?.name}</span>
          <span className="font-semibold text-[#b04b80]">€{totalPrice || selectedService?.price}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-[#7d6275]">
          <span>
            {selectedSlot
              ? `${new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'short', day: 'numeric', month: 'short' })} ${t('confirm.at')} ${selectedSlot.time}`
              : t('contact.noTimeSelected')}
          </span>
          <span>{totalDuration || selectedService?.duration} min</span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {prepTips.map((item) => (
          <span key={item} className="rounded-full border border-[#eadce5] bg-[#fffafe] px-3 py-1.5 text-xs font-medium text-[#7d6275]">
            {item}
          </span>
        ))}
      </div>

      <section className="mb-5 rounded-2xl border border-[#eadce5] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#4a3344]">{text('preparation_title', language === 'en' ? 'Before your appointment' : 'Enne visiiti')}</h3>
        <p className="mt-1 text-xs text-[#7d6275]">
          {text('preparation_helper', language === 'en' ? 'Clean nails and avoid strong oils on the same day.' : 'Puhasta küüned ja vali samal päeval kergem hooldus.')}
        </p>
      </section>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-[#443630]">
          {t('contact.firstName')} *
          <input
            ref={firstNameRef}
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`mt-1 w-full rounded-2xl border-2 bg-white px-4 py-3 text-[16px] outline-none transition sm:text-sm ${
              errors.firstName && touched.firstName ? 'border-red-300 focus:border-red-400' : 'border-[#e3dbd4] focus:border-[#c79c84]'
            }`}
          />
          {errors.firstName && touched.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
        </label>

        <label className="block text-sm font-medium text-[#443630]">
          {t('contact.lastName')} ({t('contact.optional')})
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 w-full rounded-2xl border-2 border-[#e3dbd4] bg-white px-4 py-3 text-[16px] outline-none transition focus:border-[#c79c84] sm:text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-[#443630]">
          {t('contact.phone')} *
          <div className={`mt-1 grid gap-2 ${countryCode === '+' ? 'grid-cols-[132px_110px_1fr]' : 'grid-cols-[132px_1fr]'}`}>
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className={`rounded-2xl border-2 bg-white px-3 py-3 text-[16px] outline-none transition sm:text-sm ${
                errors.phone && touched.phone ? 'border-red-300 focus:border-red-400' : 'border-[#e3dbd4] focus:border-[#c79c84]'
              }`}
              aria-label={language === 'en' ? 'Country code' : 'Riigikood'}
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} {option.label}
                </option>
              ))}
              <option value="+">{language === 'en' ? 'Custom +' : 'Muu +'}</option>
            </select>
            {countryCode === '+' && (
              <input
                type="tel"
                value={countryCode}
                onChange={(event) => handleCountryCodeChange(event.target.value)}
                className={`rounded-2xl border-2 bg-white px-3 py-3 text-[16px] outline-none transition sm:text-sm ${
                  errors.phone && touched.phone ? 'border-red-300 focus:border-red-400' : 'border-[#e3dbd4] focus:border-[#c79c84]'
                }`}
                placeholder="+372"
                aria-label={language === 'en' ? 'Custom country code' : 'Kohandatud riigikood'}
              />
            )}
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`rounded-2xl border-2 bg-white px-4 py-3 text-[16px] outline-none transition sm:text-sm ${
                errors.phone && touched.phone ? 'border-red-300 focus:border-red-400' : 'border-[#e3dbd4] focus:border-[#c79c84]'
              }`}
              placeholder="___ ___ ____"
            />
          </div>
          <p className="mt-1 text-xs text-[#74675f]">
            {text('phone_field_helper', language === 'en' ? 'Enter your phone with country code. You can change the prefix if needed.' : 'Sisesta number koos suunakoodiga. Vajadusel muuda riigikoodi.')}
          </p>
          {errors.phone && touched.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </label>

        {!showEmail ? (
          <button type="button" onClick={() => setShowEmail(true)} className="text-sm font-medium text-[#b04b80] transition hover:text-[#953d6e]">
            {t('contact.addEmail')}
          </button>
        ) : (
          <label className="block text-sm font-medium text-[#443630]">
            {t('contact.email')} ({t('contact.optional')})
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 w-full rounded-2xl border-2 bg-white px-4 py-3 text-[16px] outline-none transition sm:text-sm ${
                errors.email && touched.email ? 'border-red-300 focus:border-red-400' : 'border-[#e3dbd4] focus:border-[#c79c84]'
              }`}
            />
            {errors.email && touched.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </label>
        )}

        <section className="rounded-2xl border border-[#e7dfd7] bg-[#fcfaf8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8e7465]">
            {text('contact_optional_nails_title', language === 'en' ? 'Optional info about your nails' : 'Kiire info sinu küünte kohta (valikuline)')}
          </p>
          <h3 className="text-sm font-semibold text-[#443630]">{text('upload_title', language === 'en' ? 'Inspiration or current nail photo' : 'Inspiratsioon või praeguse küüne foto')}</h3>
          <p className="mt-1 text-xs text-[#74675f]">
            {text('upload_helper', language === 'en' ? 'Show us your inspiration. Upload your current nails for better consultation.' : 'Näita meile inspiratsiooni. Lisa praeguste küünte pilt paremaks konsultatsiooniks.')}
          </p>
          <p className="mt-2 text-xs font-medium text-[#7b6558]">
            {text(
              'upload_optional_helper',
              language === 'en'
                ? 'You can add a photo if you want us to prepare your appointment better.'
                : 'Soovi korral saad lisada pildi, et saaksime visiidi paremini ette valmistada.'
            )}
          </p>

          <input ref={inspirationInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void handleImageUpload('inspiration', event.target.files)} className="hidden" />
          <input ref={currentInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void handleImageUpload('current', event.target.files)} className="hidden" />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {uploadCard(
              'inspiration',
              text('upload_inspiration_optional_label', language === 'en' ? 'Add inspiration photo (optional)' : 'Lisa inspiratsioonipilt (valikuline)'),
              inspirationImage,
              inspirationInputRef
            )}
            {uploadCard(
              'current',
              text('upload_current_optional_label', language === 'en' ? 'Add a photo of your current nails (optional)' : 'Lisa pilt oma praegustest küüntest (valikuline)'),
              currentNailImage,
              currentInputRef
            )}
          </div>
          <p className="mt-3 text-xs text-[#74675f]">
            {text('upload_skip_reassurance', language === 'en' ? 'You can continue without uploading any photo.' : 'Võid jätkata ka ilma pildita.')}
          </p>

          <label className="mt-3 block text-xs font-medium text-[#5e4f48]">
            {text('upload_note_label', language === 'en' ? 'Add note (optional)' : 'Lisa märkus (valikuline)')}
            <input
              type="text"
              name="inspirationNote"
              value={formData.inspirationNote}
              onChange={handleChange}
              placeholder={language === 'en' ? 'Shape, length, tone...' : 'Kuju, pikkus, toon...'}
              className="mt-1 w-full rounded-xl border border-[#e1d6cd] bg-white px-3 py-2 text-[16px] outline-none focus:border-[#c79c84] sm:text-sm"
            />
          </label>
        </section>

        <label className="block text-sm font-medium text-[#443630]">
          {language === 'en' ? 'Client notes' : 'Kliendi markused'} ({t('contact.optional')})
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="mt-1 min-h-20 w-full rounded-2xl border-2 border-[#e3dbd4] bg-white px-4 py-3 text-[16px] outline-none transition focus:border-[#c79c84] sm:text-sm"
          />
        </label>
      </div>

      <button
        id="booking-sticky-primary-action"
        type="button"
        onClick={handleSubmit}
        className="cta-premium mt-5 w-full rounded-full bg-[linear-gradient(135deg,#a56b52_0%,#b88468_50%,#9a6a52_100%)] py-4 text-base font-semibold text-white shadow-[0_14px_32px_-14px_rgba(120,80,60,0.45)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(120,80,60,0.4)] active:scale-[0.99]"
      >
        {language === 'en' ? 'Confirm details and continue' : 'Kinnita andmed ja liigu edasi'}
      </button>
    </div>
  );
}

export default ContactStep;
