"use client"

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, AlertCircle, CreditCard, ArrowRight, ArrowLeft, Heart, UserPlus, LogIn, Loader2, XCircle, Landmark, FileText, LogOut } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

interface DonorData {
  firstName: string;
  lastName: string;
  secondLastName: string;
  fecha_nacimiento: string;
  rfc: string;
  email: string;
  phone: string;
  calle: string;
  num_exterior: string;
  num_interior: string;
  cp: string;
  entidad_federativa: string;
  ciudad_alcaldia: string;
  validated: boolean;
}

interface OrganizationData {
  legalName: string;
  description: string;
  rfc: string;
  email: string;
}

interface DonationHistoryItem {
  transactionId: string;
  amount: string;
  organization: string;
  date: string;
}

interface BankAccountData {
  banco: string;
  clabe: string;
  num_cuenta: string;
  titular: string;
}

interface SavedDonorPaymentMethod {
  id: string;
  numero: string;
  Nombre_completo: string;
  exp_month: number;
  exp_year: number;
}

interface RFCValidationResponse {
  isBlacklisted?: boolean;
  blacklisted?: boolean;
  inBlacklist?: boolean;
  blocked?: boolean;
  isValid?: boolean;
  valid?: boolean;
  allowed?: boolean;
  message?: string;
}

type DonorAuthMode = 'register' | 'login';
type PaymentMethod = 'online' | 'transfer' | 'bankSlip';
type RegisterFieldKey = keyof DonorData | 'donorPassword' | 'donorPasswordConfirm';
type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

export function DonationPage() {
  const { id_organizacion, organizationId } = useParams<{ id_organizacion?: string; organizationId?: string }>();
  const organizationParam = id_organizacion ?? organizationId;
  const [authMode, setAuthMode] = useState<DonorAuthMode>('register');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organizationLookupLoading, setOrganizationLookupLoading] = useState(true);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [homeView, setHomeView] = useState<'options' | 'history'>('options');
  const [donationHistory, setDonationHistory] = useState<DonationHistoryItem[]>([]);
  const [loadingDonationHistory, setLoadingDonationHistory] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [pendingTransactionId, setPendingTransactionId] = useState('');
  const [emailDeliveryWarning, setEmailDeliveryWarning] = useState('');
  const [satValidationStatus, setSatValidationStatus] = useState<'idle' | 'validating' | 'passed' | 'blocked'>('idle');
  const [validationError, setValidationError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [donorPassword, setDonorPassword] = useState('');
  const [donorPasswordConfirm, setDonorPasswordConfirm] = useState('');
  const [registerFieldErrors, setRegisterFieldErrors] = useState<RegisterFieldErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [bankAccountData, setBankAccountData] = useState<BankAccountData | null>(null);
  const [organizationNameFromOsc, setOrganizationNameFromOsc] = useState('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedDonorPaymentMethod[]>([]);
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState('');
  const [loadingSavedPaymentMethods, setLoadingSavedPaymentMethods] = useState(false);

  const [donorData, setDonorData] = useState<DonorData>({
    firstName: '',
    lastName: '',
    secondLastName: '',
    fecha_nacimiento: '',
    rfc: '',
    email: '',
    phone: '',
    calle: '',
    num_exterior: '',
    num_interior: '',
    cp: '',
    entidad_federativa: '',
    ciudad_alcaldia: '',
    validated: false,
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  const historyStorageKey = donorData.email ? `donation_history_${donorData.email.toLowerCase()}` : '';

  const loadDonationHistory = async () => {
    setLoadingDonationHistory(true);

    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        const { data: authData } = await supabase.auth.getUser();
        const activeEmail = authData.user?.email?.trim().toLowerCase() || donorData.email.trim().toLowerCase();

        if (!activeEmail) {
          setDonationHistory([]);
          return;
        }

        const { data: donorRecord, error: donorError } = await supabase
          .from('donantes')
          .select('id_donante')
          .eq('email', activeEmail)
          .maybeSingle();

        if (donorError) {
          throw donorError;
        }

        if (!donorRecord?.id_donante) {
          setDonationHistory([]);
          return;
        }

        const { data: donations, error: donationsError } = await supabase
          .from('donaciones')
          .select('folio, cantidad, id_osc, created_at')
          .eq('id_donante', donorRecord.id_donante)
          .order('created_at', { ascending: false })
          .limit(20);

        if (donationsError) {
          throw donationsError;
        }

        const organizationIds = Array.from(
          new Set((donations ?? []).map((item) => item.id_osc).filter(Boolean)),
        );

        const organizationNameMap = new Map<string, string>();

        if (organizationIds.length > 0) {
          const { data: organizations, error: organizationsError } = await supabase
            .from('osc')
            .select('id_osc, nombre_organizacion')
            .in('id_osc', organizationIds);

          if (!organizationsError && organizations) {
            organizations.forEach((organization) => {
              organizationNameMap.set(
                organization.id_osc,
                organization.nombre_organizacion?.trim() || 'Organización',
              );
            });
          }
        }

        const parsedHistory: DonationHistoryItem[] = (donations ?? []).map((item) => {
          const amountNumber = Number(item.cantidad ?? 0);
          const date = item.created_at
            ? new Date(item.created_at).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
            : '';

          return {
            transactionId: item.folio || 'Sin folio',
            amount: Number.isFinite(amountNumber) ? amountNumber.toFixed(2) : '0.00',
            organization: organizationNameMap.get(item.id_osc) || 'Organización',
            date,
          };
        });

        setDonationHistory(parsedHistory);
        return;
      }

      if (!historyStorageKey) {
        setDonationHistory([]);
        return;
      }

      const rawHistory = localStorage.getItem(historyStorageKey);

      if (!rawHistory) {
        setDonationHistory([]);
        return;
      }

      const parsedHistory = JSON.parse(rawHistory) as DonationHistoryItem[];
      setDonationHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
    } catch {
      setDonationHistory([]);
    } finally {
      setLoadingDonationHistory(false);
    }
  };

  const normalizeLetters = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-ZÑ&]/g, '');

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const findFirstInternalVowel = (value: string) => {
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    return value
      .slice(1)
      .split('')
      .find((character) => vowels.includes(character));
  };

  const getRegisterFieldErrors = (): RegisterFieldErrors => {
    const errors: RegisterFieldErrors = {};

    const firstName = donorData.firstName.trim();
    const lastName = donorData.lastName.trim();
    const secondLastName = donorData.secondLastName.trim();
    const birthDate = donorData.fecha_nacimiento;
    const rfc = donorData.rfc.trim().toUpperCase();
    const email = donorData.email.trim().toLowerCase();
    const phone = donorData.phone.trim();
    const street = donorData.calle.trim();
    const exteriorNumber = donorData.num_exterior.trim();
    const postalCode = donorData.cp.trim();
    const state = donorData.entidad_federativa.trim();
    const city = donorData.ciudad_alcaldia.trim();

    if (!email) errors.email = 'Ingresa correo electrónico.';
    if (!donorPassword.trim()) errors.donorPassword = 'Ingresa contraseña.';
    if (!donorPasswordConfirm.trim()) errors.donorPasswordConfirm = 'Confirma la contraseña.';
    if (!firstName) errors.firstName = 'Ingresa nombre(s).';
    if (!lastName) errors.lastName = 'Ingresa apellido paterno.';
    if (!secondLastName) errors.secondLastName = 'Ingresa apellido materno.';
    if (!birthDate) errors.fecha_nacimiento = 'Ingresa fecha de nacimiento.';
    if (!rfc) errors.rfc = 'Ingresa RFC.';
    if (!phone) errors.phone = 'Ingresa teléfono.';
    if (!street) errors.calle = 'Ingresa calle.';
    if (!exteriorNumber) errors.num_exterior = 'Ingresa número exterior.';
    if (!postalCode) errors.cp = 'Ingresa código postal.';
    if (!state) errors.entidad_federativa = 'Ingresa entidad federativa.';
    if (!city) errors.ciudad_alcaldia = 'Ingresa ciudad o alcaldía.';

    if (email && !isValidEmail(email)) {
      errors.email = 'El correo electrónico no tiene un formato válido.';
    }

    if (donorPassword && donorPassword.length < 8) {
      errors.donorPassword = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (donorPasswordConfirm && donorPassword !== donorPasswordConfirm) {
      errors.donorPasswordConfirm = 'Las contraseñas no coinciden.';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      errors.phone = 'El teléfono debe contener entre 10 y 15 dígitos.';
    }

    if (postalCode && !/^\d{5}$/.test(postalCode)) {
      errors.cp = 'El código postal debe tener exactamente 5 dígitos.';
    }

    if (lastName && lastName.length < 2) {
      errors.lastName = 'El apellido paterno debe tener al menos 2 caracteres para validar el RFC.';
    }

    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      errors.fecha_nacimiento = 'La fecha de nacimiento no tiene un formato válido.';
    }

    const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
    if (birthDate && Number.isNaN(parsedBirthDate.getTime())) {
      errors.fecha_nacimiento = 'La fecha de nacimiento no es válida.';
    }

    const today = new Date();
    if (birthDate && !Number.isNaN(parsedBirthDate.getTime()) && parsedBirthDate > today) {
      errors.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
    }

    const normalizedLastName = normalizeLetters(lastName);
    const normalizedSecondLastName = normalizeLetters(secondLastName);
    const normalizedFirstName = normalizeLetters(firstName);
    const normalizedRFC = normalizeLetters(rfc) + rfc.replace(/[^0-9]/g, '');

    if (rfc.length > 13) {
      errors.rfc = 'El RFC no puede tener más de 13 caracteres.';
    }

    if (rfc.length !== 13) {
      if (rfc.length > 0) {
        errors.rfc = 'El RFC debe tener exactamente 13 caracteres.';
      }
    }

    if (rfc.length === 13 && !/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
      errors.rfc = 'El RFC debe tener formato válido de persona física (4 letras, 6 dígitos de fecha y 3 de homoclave).';
    }

    if (rfc.length === 13 && (normalizedLastName.length < 2 || normalizedSecondLastName.length < 1 || normalizedFirstName.length < 1)) {
      errors.rfc = 'Nombre y apellidos deben contener letras válidas para verificar el RFC.';
    }

    const firstInternalVowel = findFirstInternalVowel(normalizedLastName);

    if (!firstInternalVowel) {
      errors.rfc = 'El apellido paterno debe incluir al menos una vocal después de la primera letra para validar el RFC.';
    }

    const expectedPrefix = `${normalizedLastName.slice(0, 1)}${firstInternalVowel ?? ''}${normalizedSecondLastName.slice(0, 1)}${normalizedFirstName.slice(0, 1)}`;
    const rfcPrefix = rfc.slice(0, 4);

    if (rfc.length === 13 && normalizedLastName.length >= 2 && normalizedSecondLastName.length >= 1 && normalizedFirstName.length >= 1 && firstInternalVowel && rfcPrefix !== expectedPrefix) {
      errors.rfc = 'Los primeros 4 caracteres del RFC no coinciden con: inicial + vocal interna del apellido paterno, inicial del apellido materno e inicial del nombre.';
    }

    const expectedDatePart = birthDate.slice(2, 4) + birthDate.slice(5, 7) + birthDate.slice(8, 10);
    const rfcDatePart = rfc.slice(4, 10);

    if (rfc.length === 13 && birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && rfcDatePart !== expectedDatePart) {
      errors.rfc = 'Los dígitos 5 al 10 del RFC no coinciden con la fecha de nacimiento (AAMMDD).';
    }

    return errors;
  };

  const validateRegisterDonorData = () => {
    const errors = getRegisterFieldErrors();
    const firstErrorKey = Object.keys(errors)[0] as RegisterFieldKey | undefined;
    return firstErrorKey ? errors[firstErrorKey] ?? 'Revisa los datos del formulario.' : null;
  };

  useEffect(() => {
    if (authMode !== 'register') {
      setRegisterFieldErrors({});
      return;
    }

    setRegisterFieldErrors(getRegisterFieldErrors());
  }, [
    authMode,
    donorData,
    donorPassword,
    donorPasswordConfirm,
  ]);

  // Load organization data
  useEffect(() => {
    let isMounted = true;

    const loadOrganizationData = async () => {
      setOrganizationLookupLoading(true);

      if (!organizationParam) {
        if (isMounted) {
          setOrganizationData(null);
          setOrganizationLookupLoading(false);
        }
        return;
      }

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();

        const [{ data: oscData, error: oscError }, { data: bankData, error: bankError }] = await Promise.all([
          supabase
            .from('osc')
            .select('id_osc, nombre_organizacion, rfc, email')
            .eq('id_osc', organizationParam)
            .maybeSingle(),
          supabase
            .from('cuenta_banco')
            .select('id_cuenta_banco')
            .eq('id_persona', organizationParam)
            .limit(1)
            .maybeSingle(),
        ]);

        if (!isMounted) {
          return;
        }

        const oscQueryFailed = Boolean(oscError && oscError.code !== 'PGRST116');
        const bankQueryFailed = Boolean(bankError && bankError.code !== 'PGRST116');

        if (!oscQueryFailed && !bankQueryFailed && oscData) {
          setOrganizationData({
            legalName: (oscData as { nombre_organizacion?: string }).nombre_organizacion?.trim() || 'Organización',
            description: '',
            rfc: (oscData as { rfc?: string }).rfc || '',
            email: (oscData as { email?: string }).email || '',
          });
          setOrganizationLookupLoading(false);
          return;
        }

        if (!oscQueryFailed && !bankQueryFailed && !oscData && bankData) {
          setOrganizationData({
            legalName: 'Organización',
            description: '',
            rfc: '',
            email: '',
          });
          setOrganizationLookupLoading(false);
          return;
        }
      }

      const savedData = localStorage.getItem(`org_profile_${organizationParam}`);
      if (savedData) {
        const data = JSON.parse(savedData);
        setOrganizationData({
          legalName: data.legalName ?? data.nombre_organizacion ?? '',
          description: data.description,
          rfc: data.rfc,
          email: data.email,
        });
      } else {
        setOrganizationData(null);
      }

      setOrganizationLookupLoading(false);
    };

    void loadOrganizationData();

    return () => {
      isMounted = false;
    };
  }, [organizationParam]);

  useEffect(() => {
    if (!organizationParam || !isSupabaseConfigured) {
      setOrganizationNameFromOsc('');
      return;
    }

    let isMounted = true;

    const loadOrganizationNameFromOsc = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('osc')
        .select('nombre_organizacion')
        .eq('id_osc', organizationParam)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error && error.code !== 'PGRST116') {
        setOrganizationNameFromOsc('');
        return;
      }

      setOrganizationNameFromOsc(data?.nombre_organizacion?.trim() || '');
    };

    void loadOrganizationNameFromOsc();

    return () => {
      isMounted = false;
    };
  }, [organizationParam]);

  useEffect(() => {
    if (step === 2) {
      void loadDonationHistory();
    }
  }, [step, historyStorageKey]);

  useEffect(() => {
    if (!organizationParam || !isSupabaseConfigured) {
      setBankAccountData(null);
      return;
    }

    let isMounted = true;

    const loadBankAccountData = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('cuenta_banco')
        .select('banco, clabe, num_cuenta, titular')
        .eq('id_persona', organizationParam)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error && error.code !== 'PGRST116') {
        setBankAccountData(null);
        return;
      }

      if (!data) {
        setBankAccountData(null);
        return;
      }

      setBankAccountData({
        banco: data.banco?.trim() || '',
        clabe: data.clabe?.trim() || '',
        num_cuenta: data.num_cuenta?.trim() || '',
        titular: data.titular?.trim() || '',
      });
    };

    void loadBankAccountData();

    return () => {
      isMounted = false;
    };
  }, [organizationParam]);

  const handleDonorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (e.target.name === 'rfc') {
      value = value.toUpperCase().replace(/\s/g, '').slice(0, 13);
    }

    if (e.target.name === 'cp') {
      value = value.replace(/\D/g, '').slice(0, 5);
    }

    setDonorData({
      ...donorData,
      [e.target.name]: value,
    });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Format card number
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    
    // Format expiry date
    if (e.target.name === 'expiryDate') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2').substr(0, 5);
    }

    if (e.target.name !== 'cvv') {
      setSelectedSavedPaymentMethodId('');
    }

    setPaymentData({
      ...paymentData,
      [e.target.name]: value,
    });
  };

  const formatSavedMethodMask = (storedNumber: string) => {
    const normalized = storedNumber.trim();

    let suffix = '****';

    const tokenLast4Match = normalized.match(/-(\d{4})$/);
    if (tokenLast4Match?.[1]) {
      suffix = tokenLast4Match[1];
    } else {
      const digitsOnly = normalized.replace(/\D/g, '');
      if (digitsOnly.length >= 4) {
        suffix = digitsOnly.slice(-4);
      }
    }

    return `•••• •••• •••• ${suffix}`;
  };

  const loadSavedPaymentMethods = async () => {
    if (!isSupabaseConfigured || paymentMethod !== 'online' || step !== 4) {
      return;
    }

    setLoadingSavedPaymentMethods(true);

    try {
      const supabase = getSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const activeEmail = authData.user?.email?.trim().toLowerCase() || donorData.email.trim().toLowerCase();

      if (!activeEmail) {
        setSavedPaymentMethods([]);
        return;
      }

      const { data: donorRecord, error: donorError } = await supabase
        .from('donantes')
        .select('id_donante')
        .eq('email', activeEmail)
        .maybeSingle();

      if (donorError) {
        throw donorError;
      }

      if (!donorRecord?.id_donante) {
        setSavedPaymentMethods([]);
        return;
      }

      const { data: methods, error: methodsError } = await supabase
        .from('cuenta_donante')
        .select('id, numero, Nombre_completo, exp_month, exp_year')
        .eq('id_donante', donorRecord.id_donante);

      if (methodsError) {
        throw methodsError;
      }

      setSavedPaymentMethods((methods ?? []) as SavedDonorPaymentMethod[]);
    } catch {
      setSavedPaymentMethods([]);
    } finally {
      setLoadingSavedPaymentMethods(false);
    }
  };

  useEffect(() => {
    void loadSavedPaymentMethods();
  }, [step, paymentMethod]);

  const selectSavedPaymentMethod = (method: SavedDonorPaymentMethod) => {
    const expiryMonth = method.exp_month.toString().padStart(2, '0');
    const expiryYear = (method.exp_year % 100).toString().padStart(2, '0');

    setSelectedSavedPaymentMethodId(method.id);
    setPaymentData((current) => ({
      ...current,
      cardNumber: formatSavedMethodMask(method.numero),
      cardHolder: method.Nombre_completo,
      expiryDate: `${expiryMonth}/${expiryYear}`,
      cvv: '',
    }));
  };

  const hashValue = async (value: string) => {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const persistOnlinePaymentMethod = async (): Promise<string | null> => {
    if (paymentMethod !== 'online') {
      return null;
    }

    if (!isSupabaseConfigured) {
      throw new Error('No se puede guardar el método de pago: Supabase no está configurado.');
    }

    const selectedSavedMethod = savedPaymentMethods.find((method) => method.id === selectedSavedPaymentMethodId);
    const usingSavedMethod = Boolean(selectedSavedMethod);

    const cardDigits = paymentData.cardNumber.replace(/\D/g, '');
    if (!usingSavedMethod && cardDigits.length < 13) {
      throw new Error('Ingresa un número de tarjeta válido para guardar el método de pago.');
    }

    if (!(selectedSavedMethod?.Nombre_completo || paymentData.cardHolder.trim())) {
      throw new Error('Ingresa el nombre del titular para guardar el método de pago.');
    }

    const [expMonthRaw, expYearRaw] = paymentData.expiryDate.split('/');
    const expMonth = Number(expMonthRaw);
    const expYearShort = Number(expYearRaw);

    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12 || !Number.isInteger(expYearShort)) {
      throw new Error('La fecha de vencimiento debe tener formato MM/AA válido.');
    }

    const expYear = 2000 + expYearShort;

    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    const activeEmail = authData.user?.email?.trim().toLowerCase() || donorData.email.trim().toLowerCase();

    if (!activeEmail) {
      throw new Error('No se encontró sesión activa del donador para guardar el método de pago.');
    }

    const { data: donorRecord, error: donorError } = await supabase
      .from('donantes')
      .select('id_donante')
      .eq('email', activeEmail)
      .maybeSingle();

    if (donorError) {
      throw donorError;
    }

    if (!donorRecord?.id_donante) {
      throw new Error('No se encontró el id del donador para guardar el método de pago.');
    }

    const accountToken = usingSavedMethod
      ? selectedSavedMethod!.numero
      : `CARD-${(await hashValue(cardDigits)).slice(0, 20)}-${cardDigits.slice(-4)}`;

    const paymentAccountPayload = {
      numero: accountToken,
      Nombre_completo: selectedSavedMethod?.Nombre_completo || paymentData.cardHolder.trim(),
      exp_month: expMonth,
      exp_year: expYear,
      id_donante: donorRecord.id_donante,
    };

    const tableName = 'cuenta_donante';

    const { data: existingMethod, error: existingMethodError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id_donante', donorRecord.id_donante)
      .eq('numero', accountToken)
      .maybeSingle();

    if (existingMethodError) {
      throw new Error(existingMethodError.message || 'No se pudo validar el método de pago existente.');
    }

    if (existingMethod?.id) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          Nombre_completo: paymentAccountPayload.Nombre_completo,
          exp_month: paymentAccountPayload.exp_month,
          exp_year: paymentAccountPayload.exp_year,
        })
        .eq('id', existingMethod.id);

      if (updateError) {
        throw new Error(updateError.message || 'No se pudo actualizar el método de pago guardado.');
      }

      return existingMethod.id;
    }

    const { data: insertedMethod, error: insertError } = await supabase
      .from(tableName)
      .insert(paymentAccountPayload)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'No se pudo guardar el método de pago para futuros pagos.');
    }

    return insertedMethod?.id ?? null;
  };

  const getDonationTypeFromPaymentMethod = () => {
    if (paymentMethod === 'transfer') {
      return 'transferencia';
    }

    if (paymentMethod === 'bankSlip') {
      return 'ficha';
    }

    return 'en linea';
  };

  const persistDonationRecord = async (generatedTransactionId: string, paymentAccountId: string | null) => {
    if (!isSupabaseConfigured) {
      throw new Error('No se pudo guardar la donación: Supabase no está configurado.');
    }

    if (!organizationParam) {
      throw new Error('No se pudo guardar la donación: organización no identificada.');
    }

    const amountValue = Number.parseFloat(String(selectedAmount).replace(',', '.'));

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new Error('No se pudo guardar la donación: monto inválido.');
    }

    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    const activeEmail = authData.user?.email?.trim().toLowerCase() || donorData.email.trim().toLowerCase();

    if (!activeEmail) {
      throw new Error('No se encontró sesión activa del donador para guardar la donación.');
    }

    const { data: donorRecord, error: donorError } = await supabase
      .from('donantes')
      .select('id_donante')
      .eq('email', activeEmail)
      .maybeSingle();

    if (donorError) {
      throw donorError;
    }

    if (!donorRecord?.id_donante) {
      throw new Error('No se encontró el id del donador para guardar la donación.');
    }

    const donationPayload = {
      cantidad: amountValue,
      Tipo: getDonationTypeFromPaymentMethod(),
      folio: generatedTransactionId,
      id_donante: donorRecord.id_donante,
      id_cuenta_banco: paymentMethod === 'online' ? paymentAccountId : null,
      id_osc: organizationParam,
    };

    const { error: donationError } = await supabase
      .from('donaciones')
      .insert(donationPayload);

    if (donationError) {
      throw new Error(donationError.message || 'No se pudo guardar la donación.');
    }
  };

  const sendDonationConfirmationEmail = async (generatedTransactionId: string) => {
    const amountValue = Number.parseFloat(String(selectedAmount).replace(',', '.'));
    const donorName = `${donorData.firstName} ${donorData.lastName}`.trim() || 'Donador';

    const response = await fetch('/api/send-donation-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        donorEmail: donorData.email.trim().toLowerCase(),
        donorName,
        amount: amountValue,
        paymentType: getDonationTypeFromPaymentMethod(),
        folio: generatedTransactionId,
        organizationName: organizationDisplayName,
      }),
    });

    if (!response.ok) {
      const responseData = (await response.json()) as { message?: string };
      throw new Error(responseData.message ?? 'No se pudo enviar el correo de confirmación.');
    }
  };

  const registerDonor = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('No se pudo conectar con Supabase para registrar al donante.');
    }

    if (donorPassword.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }

    if (donorPassword !== donorPasswordConfirm) {
      throw new Error('Las contraseñas no coinciden.');
    }

    const registerValidationError = validateRegisterDonorData();

    if (registerValidationError) {
      throw new Error(registerValidationError);
    }

    const supabase = getSupabaseClient();
    const normalizedRFC = donorData.rfc.trim().toUpperCase();
    const normalizedEmail = donorData.email.trim().toLowerCase();

    const donorPayload = {
      nombre: donorData.firstName.trim(),
      rfc: normalizedRFC,
      apellido_paterno: donorData.lastName.trim(),
      apellido_materno: donorData.secondLastName.trim(),
      fecha_nacimiento: donorData.fecha_nacimiento,
      email: normalizedEmail,
      telefono: donorData.phone.trim(),
    };

    const addressPayload = {
      calle: donorData.calle.trim(),
      num_exterior: donorData.num_exterior.trim(),
      num_interior: donorData.num_interior.trim() || null,
      cp: donorData.cp.trim(),
      entidad_federativa: donorData.entidad_federativa.trim(),
      ciudad_alcaldia: donorData.ciudad_alcaldia.trim(),
    };

    const { data: existingByRFC, error: existingByRFCError } = await supabase
      .from('donantes')
      .select('rfc')
      .eq('rfc', normalizedRFC)
      .maybeSingle();

    if (existingByRFCError && existingByRFCError.code !== 'PGRST116') {
      throw existingByRFCError;
    }

    let donorExists = Boolean(existingByRFC);

    if (!donorExists) {
      const { data: existingByEmail, error: existingByEmailError } = await supabase
        .from('donantes')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingByEmailError && existingByEmailError.code !== 'PGRST116') {
        throw existingByEmailError;
      }

      donorExists = Boolean(existingByEmail);
    }

    if (donorExists) {
      setAuthMode('login');
      throw new Error('Este donante ya está registrado. Inicia sesión para continuar.');
    }

    const response = await fetch('/api/register-donor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        donor: donorPayload,
        address: addressPayload,
        password: donorPassword,
      }),
    });

    const responseData = (await response.json()) as { message?: string };

    if (!response.ok) {
      const message = responseData.message ?? 'No se pudo registrar al donante.';
      if (message.toLowerCase().includes('ya tiene cuenta') || message.toLowerCase().includes('already')) {
        setAuthMode('login');
      }
      throw new Error(message);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: donorPassword,
    });

    if (signInError || !signInData.user) {
      throw new Error('La cuenta se creó, pero no se pudo iniciar sesión automáticamente. Intenta iniciar sesión manualmente.');
    }

    setDonorData((current) => ({
      ...current,
      rfc: normalizedRFC,
      email: normalizedEmail,
      validated: true,
    }));
    setValidationMessage('Registro completado. Ya puedes continuar con tu donación y usar login en futuras donaciones.');
    setHomeView('options');
    setSatValidationStatus('idle');
    setStep(2);
  };

  const loginDonor = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('No se pudo conectar con Supabase para iniciar sesión.');
    }

    if (!donorData.email.trim() || !donorPassword.trim()) {
      throw new Error('Ingresa correo y contraseña para iniciar sesión.');
    }

    const supabase = getSupabaseClient();
    const normalizedEmail = donorData.email.trim().toLowerCase();

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: donorPassword,
    });

    if (signInError) {
      throw signInError;
    }

    if (!signInData.user) {
      throw new Error('No fue posible validar la sesión del donante.');
    }

    const { data: donorRecord, error: donorRecordError } = await supabase
      .from('donantes')
      .select('nombre, rfc, apellido_paterno, apellido_materno, fecha_nacimiento, email, telefono')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (donorRecordError && donorRecordError.code !== 'PGRST116') {
      throw donorRecordError;
    }

    if (!donorRecord) {
      await supabase.auth.signOut();
      throw new Error('Tu cuenta no está registrada como donador en este sistema. No es posible continuar.');
    }

    setDonorData((current) => ({
      ...current,
      firstName: donorRecord.nombre,
      lastName: donorRecord.apellido_paterno,
      secondLastName: donorRecord.apellido_materno,
      fecha_nacimiento: donorRecord.fecha_nacimiento,
      rfc: donorRecord.rfc,
      email: donorRecord.email ?? normalizedEmail,
      phone: donorRecord.telefono,
      validated: true,
    }));

    setValidationMessage('Inicio de sesión correcto. Puedes continuar con tu donación.');
    setHomeView('options');
    setSatValidationStatus('idle');
    setStep(2);
  };

  const validateRfcAgainstSatBlacklist = async () => {
    let blockedBySat = false;
    setValidationError('');
    setValidationMessage('');
    setSatValidationStatus('validating');
    setLoading(true);

    try {
      let rfcToValidate = donorData.rfc.trim().toUpperCase();

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        const { data: authData } = await supabase.auth.getUser();
        const activeEmail = authData.user?.email?.trim().toLowerCase();

        if (activeEmail) {
          const { data: activeDonor, error: activeDonorError } = await supabase
            .from('donantes')
            .select('rfc')
            .eq('email', activeEmail)
            .maybeSingle();

          if (activeDonorError && activeDonorError.code !== 'PGRST116') {
            throw activeDonorError;
          }

          if (activeDonor?.rfc) {
            rfcToValidate = String(activeDonor.rfc).trim().toUpperCase();
            setDonorData((current) => ({ ...current, rfc: rfcToValidate }));
          }
        }
      }

      if (!rfcToValidate) {
        setSatValidationStatus('idle');
        setValidationError('No se encontró RFC en el perfil activo para validar contra lista negra SAT.');
        return;
      }

      const validateRFC = async (rfc: string) => {
        const fallbackEndpoint = '/api/validate-rfc-blacklist';
        const externalEndpoint = process.env.NEXT_PUBLIC_RFC_VALIDATION_URL?.trim().replace(/\/$/, '');
        const endpoints = externalEndpoint ? [fallbackEndpoint, externalEndpoint] : [fallbackEndpoint];

        let lastErrorMessage = 'No fue posible validar RFC contra lista negra SAT.';

        for (const endpoint of endpoints) {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 20000);

          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ rfc }),
              signal: controller.signal,
            });

            const rawBody = await response.text();
            let data: RFCValidationResponse = {};

            if (rawBody) {
              try {
                data = JSON.parse(rawBody) as RFCValidationResponse;
              } catch {
                data = { message: rawBody };
              }
            }

            if (!response.ok) {
              lastErrorMessage = data.message ?? `Error ${response.status} validando RFC en ${endpoint}.`;
              continue;
            }

            return data;
          } catch (requestError) {
            if (requestError instanceof DOMException && requestError.name === 'AbortError') {
              lastErrorMessage = `Tiempo de espera agotado validando RFC en ${endpoint}.`;
              continue;
            }

            if (requestError instanceof TypeError) {
              lastErrorMessage = `No se pudo conectar al servicio de validación (${endpoint}). Verifica URL/CORS.`;
              continue;
            }

            lastErrorMessage = requestError instanceof Error ? requestError.message : 'Error inesperado validando RFC.';
          } finally {
            window.clearTimeout(timeoutId);
          }
        }

        throw new Error(lastErrorMessage);
      };

      const data = await validateRFC(rfcToValidate);

      const inferredBlacklisted =
        data.isBlacklisted ??
        data.blacklisted ??
        data.inBlacklist ??
        data.blocked ??
        (typeof data.isValid === 'boolean' ? !data.isValid : undefined) ??
        (typeof data.valid === 'boolean' ? !data.valid : undefined) ??
        (typeof data.allowed === 'boolean' ? !data.allowed : undefined) ??
        false;

      if (inferredBlacklisted) {
        blockedBySat = true;
        setSatValidationStatus('blocked');
        throw new Error(data.message ?? 'No se puede continuar: RFC detectado en lista negra SAT.');
      }

      setSatValidationStatus('passed');
      setValidationMessage('RFC validado correctamente. Puedes continuar con tu donación.');
      setStep(3);
    } catch (error) {
      if (!blockedBySat) {
        setSatValidationStatus('idle');
      }
      const message = error instanceof Error ? error.message : 'No fue posible validar el RFC en este momento.';
      setValidationError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setValidationMessage('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        await loginDonor();
      } else {
        await registerDonor();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible validar al donante.';
      setValidationError(message);
    } finally {
      setLoading(false);
    }
  };

  const proceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setPendingTransactionId(`DON-${Date.now().toString().slice(-8)}`);
      setStep(4);
      setLoading(false);
    }, 1000);
  };

  const generateBankSlipPdf = (generatedTransactionId: string) => {
    const emissionDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(emissionDate.getDate() + 10);

    const amountNumber = Number(selectedAmount || 0);
    const amountFormatted = amountNumber.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const donorFullName = `${donorData.firstName} ${donorData.lastName} ${donorData.secondLastName}`.trim();
    const issueDateText = emissionDate.toLocaleString('es-MX');
    const expiryDateText = expiryDate.toLocaleDateString('es-MX');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 40;
    let cursorY = 52;

    const writePair = (label: string, value: string) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`${label}:`, marginX, cursorY);

      pdf.setFont('helvetica', 'normal');
      const wrappedValue = pdf.splitTextToSize(value || 'No especificado', pageWidth - marginX - 180);
      pdf.text(wrappedValue, marginX + 120, cursorY);
      cursorY += Math.max(20, wrappedValue.length * 14);
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Ficha de Pago para Donacion', marginX, cursorY);
    cursorY += 24;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text('Sistema de Donaciones Appleseed Mexico', marginX, cursorY);
    pdf.text(`Folio: ${generatedTransactionId}`, pageWidth - 180, cursorY);
    cursorY += 18;

    pdf.setDrawColor(17, 24, 39);
    pdf.setLineWidth(1.2);
    pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 24;

    writePair('Donador', donorFullName || 'No especificado');
    writePair('RFC', donorData.rfc || 'No especificado');
    writePair('Correo', donorData.email || 'No especificado');
    writePair('Organizacion', organizationDisplayName);
    cursorY += 8;

    writePair('Banco receptor', bankAccountData?.banco || 'No disponible');
    writePair('Beneficiario', bankAccountData?.titular || organizationDisplayName);
    writePair('CLABE', bankAccountData?.clabe || 'No disponible');
    writePair('Cuenta', bankAccountData?.num_cuenta || 'No disponible');
    writePair('Concepto', `DON ${organizationDisplayName.slice(0, 30).toUpperCase()}`);
    cursorY += 12;

    pdf.setDrawColor(17, 24, 39);
    pdf.setLineWidth(2);
    pdf.rect(marginX, cursorY, pageWidth - marginX * 2, 170);

    cursorY += 26;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('SECCION LINEA DE CAPTURA', pageWidth / 2, cursorY, { align: 'center' });

    cursorY += 30;
    pdf.setFontSize(10);
    pdf.text('Linea de captura', marginX + 18, cursorY);
    pdf.setFontSize(20);
    pdf.text(lineaCaptura || 'No disponible', pageWidth / 2, cursorY + 24, { align: 'center' });

    cursorY += 58;
    pdf.setFontSize(11);
    pdf.text(`Importe total: $${amountFormatted} MXN`, marginX + 18, cursorY);
    cursorY += 18;
    pdf.text(`Fecha y hora de emision: ${issueDateText}`, marginX + 18, cursorY);
    cursorY += 18;
    pdf.text(`Vigente hasta: ${expiryDateText}`, marginX + 18, cursorY);
    cursorY += 28;
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    pdf.text('Presenta esta ficha en banca movil, banca web o ventanilla para completar tu donacion.', marginX + 18, cursorY);

    const safeTransactionId = generatedTransactionId.replace(/[^A-Za-z0-9-_]/g, '');
    pdf.save(`ficha-bancaria-${safeTransactionId}.pdf`);
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      setEmailDeliveryWarning('');
      const paymentAccountId = await persistOnlinePaymentMethod();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const generatedTransactionId = pendingTransactionId || `DON-${Date.now().toString().slice(-8)}`;
      setPendingTransactionId(generatedTransactionId);
      setTransactionId(generatedTransactionId);

      await persistDonationRecord(generatedTransactionId, paymentAccountId);

      try {
        await sendDonationConfirmationEmail(generatedTransactionId);
      } catch (emailError) {
        const emailErrorMessage = emailError instanceof Error
          ? emailError.message
          : 'Error desconocido enviando correo.';
        setEmailDeliveryWarning(`La donación se registró, pero no fue posible enviar el correo de confirmación. ${emailErrorMessage}`);
      }

      if (paymentMethod === 'bankSlip') {
        generateBankSlipPdf(generatedTransactionId);
      }

      if (historyStorageKey) {
        const currentDate = new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        const newHistoryItem: DonationHistoryItem = {
          transactionId: generatedTransactionId,
          amount: selectedAmount,
          organization: organizationDisplayName,
          date: currentDate,
        };

        const updatedHistory = [newHistoryItem, ...donationHistory].slice(0, 20);
        localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
        setDonationHistory(updatedHistory);
      }

      setPaymentCompleted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible completar el pago.';
      setValidationError(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDonationAndLogout = async () => {
    const shouldCancel = window.confirm('¿Deseas cancelar la donación y cerrar sesión?');

    if (!shouldCancel) {
      return;
    }

    setLoading(true);
    setValidationError('');
    setValidationMessage('');

    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      }
    } catch {
      // Continue with local reset even if remote sign out fails
    } finally {
      setDonorData({
        firstName: '',
        lastName: '',
        secondLastName: '',
        fecha_nacimiento: '',
        rfc: '',
        email: '',
        phone: '',
        calle: '',
        num_exterior: '',
        num_interior: '',
        cp: '',
        entidad_federativa: '',
        ciudad_alcaldia: '',
        validated: false,
      });
      setDonorPassword('');
      setDonorPasswordConfirm('');
      setDonationAmount('');
      setCustomAmount('');
      setPaymentData({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
      });
      setPendingTransactionId('');
      setEmailDeliveryWarning('');
      setHomeView('options');
      setDonationHistory([]);
      setSatValidationStatus('idle');
      setAuthMode('register');
      setStep(1);
      setLoading(false);
    }
  };

  const selectedAmount = customAmount || donationAmount;
  const organizationDisplayName = organizationNameFromOsc || organizationData?.legalName || 'Organización';
  const captureSeed = `${organizationParam ?? 'ORG'}-${selectedAmount}`;
  const captureChecksum = captureSeed
    .split('')
    .reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
  const lineaCaptura = selectedAmount
    ? `LS-${captureChecksum.toString().padStart(8, '0')}-${selectedAmount.padStart(6, '0')}`
    : '';

  const predefinedAmounts = ['100', '500', '1000', '2000', '5000'];
  const inputClass = 'w-full px-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition';
  const progressItems = [
    { stepNum: 1, label: 'Validación' },
    { stepNum: 2, label: 'Inicio' },
    { stepNum: 3, label: 'Monto' },
    { stepNum: 4, label: 'Pago' },
  ] as const;

  const getProgressState = (stepNum: number) => {
    if (stepNum === 2 && satValidationStatus === 'blocked') {
      return 'blocked' as const;
    }

    if (stepNum === 2 && satValidationStatus === 'validating') {
      return 'validating' as const;
    }

    if (step > stepNum) {
      return 'completed' as const;
    }

    if (step === stepNum) {
      return 'current' as const;
    }

    return 'upcoming' as const;
  };

  if (organizationLookupLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Loader2 className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Validando organización</h2>
          <p className="text-gray-600">Estamos verificando el enlace con la información en Supabase.</p>
        </div>
      </div>
    );
  }

  if (!organizationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Organización No Encontrada</h2>
          <p className="text-gray-600">
            La organización no ha completado su perfil o el enlace no es válido.
          </p>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Donación Exitosa!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Tu donación de <span className="font-bold text-emerald-600">${selectedAmount} MXN</span> ha sido procesada exitosamente.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Beneficiario:</strong> {organizationDisplayName}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Donante:</strong> {donorData.firstName} {donorData.lastName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>ID de transacción:</strong> {transactionId}
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Recibirás un comprobante por correo electrónico a <strong>{donorData.email}</strong>
          </p>
          {emailDeliveryWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-amber-800">{emailDeliveryWarning}</p>
            </div>
          )}
          <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">¡Gracias por tu generosidad!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-20 w-72 h-72 bg-teal-200/40 rounded-full blur-3xl" />
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Donación a {organizationDisplayName}
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm border border-white rounded-2xl shadow-lg p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {progressItems.map((item) => {
              const state = getProgressState(item.stepNum);

              const cardClass =
                state === 'blocked'
                  ? 'border-red-300 bg-red-50'
                  : state === 'completed'
                    ? 'border-emerald-300 bg-emerald-50'
                    : state === 'current'
                      ? 'border-emerald-300 bg-white'
                      : 'border-gray-200 bg-gray-50';

              const circleClass =
                state === 'blocked'
                  ? 'bg-red-600 text-white'
                  : state === 'completed' || state === 'current'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-500';

              return (
                <div key={item.stepNum} className={`rounded-xl border p-3 transition ${cardClass}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${circleClass}`}>
                      {state === 'blocked' ? (
                        <XCircle className="w-5 h-5" />
                      ) : state === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : state === 'validating' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        item.stepNum
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${state === 'blocked' ? 'text-red-700' : 'text-gray-800'}`}>{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Donor Validation */}
        {step === 1 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Validación de Donante</h2>
            <p className="text-sm text-gray-600 mb-6">Completa tus datos para crear tu cuenta o inicia sesión para donar más rápido.</p>
            <form onSubmit={validateDonor} className="space-y-6">
              <div className="grid grid-cols-2 gap-2 bg-gray-100/90 rounded-xl p-1.5 border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setValidationError('');
                    setValidationMessage('');
                  }}
                  className={`rounded-lg py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Nuevo donador
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setValidationError('');
                    setValidationMessage('');
                  }}
                  className={`rounded-lg py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Ya tengo cuenta
                </button>
              </div>

              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{validationError}</p>
                </div>
              )}

              {validationMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-700">{validationMessage}</p>
                </div>
              )}

              {authMode === 'register' && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-medium text-emerald-800">Registro guiado</p>
                  <p className="text-xs text-emerald-700 mt-1">Primero crea tu cuenta y luego completa tus datos personales y dirección.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={donorData.email}
                    onChange={handleDonorChange}
                    className={inputClass}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={donorPassword}
                    onChange={(e) => setDonorPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                {authMode === 'register' && (
                  <>
                    <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <p className="text-sm font-semibold text-gray-800">Datos personales</p>
                        <span className={`text-xs rounded-lg px-2 py-1 border whitespace-nowrap ${
                          !registerFieldErrors.firstName && !registerFieldErrors.lastName && !registerFieldErrors.secondLastName && !registerFieldErrors.fecha_nacimiento && !registerFieldErrors.phone
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-amber-300 bg-amber-100 text-amber-800'
                        }`}>
                          {!registerFieldErrors.firstName && !registerFieldErrors.lastName && !registerFieldErrors.secondLastName && !registerFieldErrors.fecha_nacimiento && !registerFieldErrors.phone ? 'Completo' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre(s) *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            required
                            value={donorData.firstName}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="Juan"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Apellido Paterno *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            required
                            value={donorData.lastName}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="Pérez"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Apellido Materno *
                          </label>
                          <input
                            type="text"
                            name="secondLastName"
                            required
                            value={donorData.secondLastName}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="García"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Nacimiento *
                          </label>
                          <input
                            type="date"
                            name="fecha_nacimiento"
                            required
                            value={donorData.fecha_nacimiento}
                            onChange={handleDonorChange}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            RFC *
                          </label>
                          <input
                            type="text"
                            name="rfc"
                            required
                            value={donorData.rfc}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="PEGJ850101XXX"
                          />
                          {donorData.rfc.length > 0 && (
                            <p className={`text-xs mt-1 ${registerFieldErrors.rfc ? 'text-red-600' : 'text-emerald-700'}`}>
                              {registerFieldErrors.rfc ?? 'RFC válido.'}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            required
                            value={donorData.phone}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="+52 55 1234 5678"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <p className="text-sm font-semibold text-gray-800">Dirección</p>
                        <span className={`text-xs rounded-lg px-2 py-1 border whitespace-nowrap ${
                          !registerFieldErrors.calle && !registerFieldErrors.num_exterior && !registerFieldErrors.cp && !registerFieldErrors.entidad_federativa && !registerFieldErrors.ciudad_alcaldia
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-amber-300 bg-amber-100 text-amber-800'
                        }`}>
                          {!registerFieldErrors.calle && !registerFieldErrors.num_exterior && !registerFieldErrors.cp && !registerFieldErrors.entidad_federativa && !registerFieldErrors.ciudad_alcaldia ? 'Completa' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calle *
                          </label>
                          <input
                            type="text"
                            name="calle"
                            required
                            value={donorData.calle}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="Av. Reforma"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Núm. Exterior *
                          </label>
                          <input
                            type="text"
                            name="num_exterior"
                            required
                            value={donorData.num_exterior}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="123"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Núm. Interior
                          </label>
                          <input
                            type="text"
                            name="num_interior"
                            value={donorData.num_interior}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="4B"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Código Postal *
                          </label>
                          <input
                            type="text"
                            name="cp"
                            required
                            value={donorData.cp}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="06000"
                            inputMode="numeric"
                            maxLength={5}
                          />
                          {donorData.cp.length > 0 && (
                            <p className={`text-xs mt-1 ${registerFieldErrors.cp ? 'text-red-600' : 'text-emerald-700'}`}>
                              {registerFieldErrors.cp ?? 'Código postal válido.'}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Entidad Federativa *
                          </label>
                          <input
                            type="text"
                            name="entidad_federativa"
                            required
                            value={donorData.entidad_federativa}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="Ciudad de México"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ciudad / Alcaldía *
                          </label>
                          <input
                            type="text"
                            name="ciudad_alcaldia"
                            required
                            value={donorData.ciudad_alcaldia}
                            onChange={handleDonorChange}
                            className={inputClass}
                            placeholder="Cuauhtémoc"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Contraseña *
                      </label>
                      <input
                        type="password"
                        required
                        value={donorPasswordConfirm}
                        onChange={(e) => setDonorPasswordConfirm(e.target.value)}
                        className={inputClass}
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (authMode === 'register' && Object.keys(registerFieldErrors).length > 0)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-semibold transition shadow-lg shadow-emerald-600/30"
              >
                {loading
                  ? authMode === 'login'
                    ? 'Iniciando sesión...'
                    : 'Registrando...'
                  : authMode === 'login'
                    ? 'Iniciar Sesión y Continuar'
                    : 'Registrarme y Continuar'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Donor Home */}
        {step === 2 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Inicio del Donador</h2>
              <p className="text-sm text-gray-600">Elige qué deseas hacer antes de continuar.</p>
            </div>

            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            {validationMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-700">{validationMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setHomeView('options');
                  void validateRfcAgainstSatBlacklist();
                }}
                disabled={loading}
                className="w-full p-5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left transition disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Validando RFC...' : 'Continuar con la donación'}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  {loading ? 'Espera un momento mientras llega la respuesta del servicio.' : 'Validaremos primero tu RFC contra lista negra SAT.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHomeView('history');
                  void loadDonationHistory();
                }}
                className="w-full p-5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition"
              >
                <p className="text-sm font-semibold text-gray-800">Visualizar historial de donaciones</p>
                <p className="text-xs text-gray-600 mt-1">Revisa tus contribuciones anteriores registradas.</p>
              </button>
            </div>

            {homeView === 'history' && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Historial de donaciones</p>

                {loadingDonationHistory ? (
                  <p className="text-sm text-gray-600">Cargando historial...</p>
                ) : donationHistory.length === 0 ? (
                  <p className="text-sm text-gray-600">Aún no tienes donaciones registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {donationHistory.map((item) => (
                      <div key={item.transactionId} className="rounded-lg border border-gray-200 p-3">
                        <p className="text-sm font-medium text-gray-900">${item.amount} MXN · {item.organization}</p>
                        <p className="text-xs text-gray-600">{item.date} · {item.transactionId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => void cancelDonationAndLogout()}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition disabled:opacity-60"
              >
                <LogOut className="w-5 h-5" />
                Cancelar donación
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Donation Amount */}
        {step === 3 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona el Monto</h2>
            <p className="text-sm text-gray-600 mb-6">Elige una cantidad sugerida o captura un monto personalizado para tu donación.</p>

            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <p className="text-xs text-emerald-700">Donación actual</p>
              <p className="text-3xl font-bold text-emerald-800 mt-1">
                {selectedAmount ? `$${selectedAmount} MXN` : 'Aún sin monto seleccionado'}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Tu aportación se destina directamente al programa de {organizationDisplayName}.</p>
            </div>

            <form onSubmit={proceedToPayment} className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {predefinedAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setDonationAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`p-4 border-2 rounded-xl font-semibold text-lg transition ${
                      donationAmount === amount && !customAmount
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-200 hover:border-emerald-300 text-gray-700 bg-white'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Otra cantidad (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    min="10"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setDonationAmount('');
                    }}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    placeholder="Ingresa un monto personalizado"
                  />
                </div>
              </div>

              {selectedAmount && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-center text-gray-700">
                    Estás a punto de donar{' '}
                    <span className="text-2xl font-bold text-emerald-700">${selectedAmount} MXN</span>
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={!selectedAmount || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
                >
                  {loading ? 'Procesando...' : 'Continuar al Pago'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de Pago</h2>

            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 mb-6 text-white">
              <p className="text-sm text-emerald-50 mb-1">Monto a donar</p>
              <p className="text-4xl font-bold">${selectedAmount} MXN</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMethod === 'online'
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Pago en línea
                </p>
                <p className="text-xs text-gray-600 mt-1">Tarjeta de débito o crédito</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMethod === 'transfer'
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  Transferencia
                </p>
                <p className="text-xs text-gray-600 mt-1">SPEI o transferencia bancaria</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bankSlip')}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMethod === 'bankSlip'
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  Ficha bancaria
                </p>
                <p className="text-xs text-gray-600 mt-1">Generar línea de captura</p>
              </button>
            </div>

            <form onSubmit={processPayment} className="space-y-6">
              {paymentMethod === 'online' && (
                <>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Métodos usados anteriormente</p>

                    {loadingSavedPaymentMethods ? (
                      <p className="text-xs text-gray-500">Cargando métodos guardados...</p>
                    ) : savedPaymentMethods.length === 0 ? (
                      <p className="text-xs text-gray-500">No tienes métodos guardados aún.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {savedPaymentMethods.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => selectSavedPaymentMethod(method)}
                            className={`rounded-lg border p-3 text-left transition ${
                              selectedSavedPaymentMethodId === method.id
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-800">{formatSavedMethodMask(method.numero)}</p>
                            <p className="text-xs text-gray-600 mt-1">{method.Nombre_completo}</p>
                            <p className="text-xs text-gray-500 mt-1">Vence {method.exp_month.toString().padStart(2, '0')}/{(method.exp_year % 100).toString().padStart(2, '0')}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Tarjeta *
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="cardNumber"
                        required
                        maxLength={19}
                        value={paymentData.cardNumber}
                        onChange={handlePaymentChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Titular *
                    </label>
                    <input
                      type="text"
                      name="cardHolder"
                      required
                      value={paymentData.cardHolder}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                      placeholder="JUAN PEREZ GARCIA"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Vencimiento *
                      </label>
                      <input
                        type="text"
                        name="expiryDate"
                        required
                        maxLength={5}
                        value={paymentData.expiryDate}
                        onChange={handlePaymentChange}
                        className="w-full px-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        placeholder="MM/AA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        required
                        maxLength={3}
                        value={paymentData.cvv}
                        onChange={handlePaymentChange}
                        className="w-full px-4 py-3 border border-gray-300/90 rounded-xl bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </>
              )}

              {paymentMethod === 'transfer' && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-900">Datos para transferencia bancaria</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                    <p><span className="font-semibold">Banco:</span> {bankAccountData?.banco || 'No disponible'}</p>
                    <p><span className="font-semibold">Beneficiario:</span> {bankAccountData?.titular || organizationDisplayName}</p>
                    <p><span className="font-semibold">CLABE:</span> {bankAccountData?.clabe || 'No disponible'}</p>
                    <p><span className="font-semibold">Cuenta:</span> {bankAccountData?.num_cuenta || 'No disponible'}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">Concepto / Folio:</span> {pendingTransactionId || 'Se asignará al confirmar'}</p>
                  </div>
                  <p className="text-xs text-gray-600">Envía el comprobante al correo de la organización para confirmar tu donación.</p>
                  {!bankAccountData && (
                    <p className="text-xs text-amber-700">Esta organización aún no tiene datos bancarios configurados en cuenta_banco.</p>
                  )}
                </div>
              )}

              {paymentMethod === 'bankSlip' && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-900">Ficha bancaria con línea de captura</p>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-700 mb-1">Línea de captura</p>
                    <p className="text-xl font-bold text-emerald-800 tracking-wide">{lineaCaptura}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                    <p><span className="font-semibold">Monto:</span> ${selectedAmount} MXN</p>
                    <p><span className="font-semibold">Vigencia:</span> 48 horas</p>
                    <p><span className="font-semibold">Banco:</span> {bankAccountData?.banco || 'No disponible'}</p>
                    <p><span className="font-semibold">Cuenta:</span> {bankAccountData?.num_cuenta || 'No disponible'}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">Referencia:</span> Donación a {organizationDisplayName}</p>
                  </div>
                  <p className="text-xs text-gray-600">Puedes pagar esta ficha en banca móvil, banca web o ventanilla del banco.</p>
                  {!bankAccountData && (
                    <p className="text-xs text-amber-700">No hay cuenta bancaria disponible para generar ficha completa.</p>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Transacción Segura</p>
                    <p className="text-sm text-blue-700">
                      Tu información está protegida con cifrado de nivel bancario. Verificado por Appleseed México.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
                >
                  {loading
                    ? paymentMethod === 'online'
                      ? 'Procesando Pago...'
                      : paymentMethod === 'transfer'
                        ? 'Confirmando Transferencia...'
                        : 'Generando Ficha...'
                    : paymentMethod === 'online'
                      ? 'Completar Donación'
                      : paymentMethod === 'transfer'
                        ? 'Confirmar Transferencia'
                        : 'Generar Ficha y Finalizar'}
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Sistema seguro verificado por Appleseed México
          </p>
        </div>
      </div>
    </div>
  );
}
