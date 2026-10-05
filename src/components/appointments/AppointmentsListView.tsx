/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Send,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  UserX,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Sparkles,
  Phone,
  ShieldCheck,
  CreditCard,
  User,
  Package,
  Layers,
  MapPin,
  Bell,
} from 'lucide-react';
import {
  type AppointmentType,
  type AppointmentStatus,
  type TemporalStatus,
  APPOINTMENT_TYPES_MAP,
  APPOINTMENT_TYPE_KEYS,
  APPOINTMENT_STATUS_MAP,
  DEFAULT_APP_LOCATION,
  getTodayStringCI,
  getTomorrowStringCI,
  formatAppointmentDate,
  formatAppointmentTime,
  getAppointmentTemporalStatus,
} from '../../lib/appointmentUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { formatCFA } from '../../lib/orderUtils';
import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
  AppointmentTemporalBadge,
} from './AppointmentBadge';
import { AppointmentFormModal } from './AppointmentFormModal';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AppointmentRetraitModal } from './AppointmentRetraitModal';
import { AppointmentWhatsAppModal } from './AppointmentWhatsAppModal';

interface AppointmentsListViewProps {
  onOpenClientDetail?: (clientId: string) => void;
  onOpenOrderDetail?: (orderId: string) => void;
  onStatsUpdated?: (stats: { today: number; late: number; totalActive: number }) => void;
  initialFilter?: 'today' | 'tomorrow' | 'late' | 'all';
}

export const AppointmentsListView: React.FC<AppointmentsListViewProps> = ({
  onOpenClientDetail,
  onOpenOrderDetail,
  onStatsUpdated,
  initialFilter = 'all',
}) => {
  // Navigation et mode d'affichage (liste vs calendrier)
  const [activeTabMode, setActiveTabMode] = useState<'liste' | 'calendrier'>('liste');
  const [calendarViewType, setCalendarViewType] = useState<'jour' | 'semaine' | 'mois' | 'agenda'>('semaine');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Données et indicateurs
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    tomorrow: 0,
    late: 0,
    upcoming: 0,
    completedMonth: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isProcessingReminders, setIsProcessingReminders] = useState(false);
  const [reminderReport, setReminderReport] = useState<{
    success: boolean;
    sentJ1Count?: number;
    sentJourJCount?: number;
    message?: string;
  } | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [temporalQuickFilter, setTemporalQuickFilter] = useState<string>(initialFilter);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [responsableFilter, setResponsableFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Alertes du haut (Aujourd'hui, Demain, En retard)
  const [todayApts, setTodayApts] = useState<any[]>([]);
  const [tomorrowApts, setTomorrowApts] = useState<any[]>([]);
  const [lateApts, setLateApts] = useState<any[]>([]);

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any | null>(null);

  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [retraitAppointment, setRetraitAppointment] = useState<any | null>(null);
  const [isRetraitModalOpen, setIsRetraitModalOpen] = useState(false);

  const [whatsAppAppointment, setWhatsAppAppointment] = useState<any | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<string>('confirmation_rendez_vous');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Charger les statistiques globales
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments/stats');
      const data = await res.json();
      if (data.success) {
        setStats({
          today: data.today || 0,
          tomorrow: data.tomorrow || 0,
          late: data.late || 0,
          upcoming: data.upcoming || 0,
          completedMonth: data.completedMonth || 0,
          total: data.total || 0,
        });
        if (onStatsUpdated) {
          onStatsUpdated({
            today: data.today || 0,
            late: data.late || 0,
            totalActive: (data.today || 0) + (data.late || 0),
          });
        }
      }
    } catch (err) {
      console.error('Erreur chargement stats rendez-vous :', err);
    }
  }, [onStatsUpdated]);

  // Charger les alertes urgentes (Aujourd'hui, Demain, Retard)
  const fetchAlerts = useCallback(async () => {
    try {
      const [resToday, resTomorrow, resLate] = await Promise.all([
        fetch('/api/appointments/today'),
        fetch('/api/appointments/tomorrow'),
        fetch('/api/appointments/late'),
      ]);

      const [dataToday, dataTomorrow, dataLate] = await Promise.all([
        resToday.json(),
        resTomorrow.json(),
        resLate.json(),
      ]);

      if (dataToday.success) setTodayApts(dataToday.appointments || []);
      if (dataTomorrow.success) setTomorrowApts(dataTomorrow.appointments || []);
      if (dataLate.success) setLateApts(dataLate.appointments || []);
    } catch (err) {
      console.error('Erreur alertes rendez-vous :', err);
    }
  }, []);

  // Charger la liste filtrée
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedType) params.append('type', selectedType);
      if (responsableFilter) params.append('responsable', responsableFilter);
      if (specificDate) params.append('date', specificDate);

      if (temporalQuickFilter === 'today') params.append('temporalStatus', 'TODAY');
      else if (temporalQuickFilter === 'tomorrow') params.append('temporalStatus', 'TOMORROW');
      else if (temporalQuickFilter === 'late') params.append('temporalStatus', 'LATE');
      else if (temporalQuickFilter === 'upcoming') params.append('temporalStatus', 'UPCOMING');

      params.append('page', String(page));
      params.append('limit', '25');

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Erreur chargement rendez-vous :', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedType, responsableFilter, specificDate, temporalQuickFilter, page]);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchAppointments();
  }, [fetchStats, fetchAlerts, fetchAppointments]);

  // Traiter les rappels automatiques (J-1 et Jour J)
  const handleProcessReminders = async () => {
    if (!window.confirm('Voulez-vous vérifier et expédier les rappels WhatsApp (J-1 et Jour J) aux clients éligibles ?')) {
      return;
    }

    setIsProcessingReminders(true);
    setReminderReport(null);
    try {
      const res = await fetch('/api/appointments/process-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setReminderReport(data);
      await fetchStats();
      await fetchAlerts();
      await fetchAppointments();
    } catch (err) {
      console.error('Erreur traitement rappels :', err);
      setReminderReport({ success: false, message: 'Échec de connexion au serveur.' });
    } finally {
      setIsProcessingReminders(false);
    }
  };

  // Actions rapides d'alerte (Confirmer, Terminer)
  const handleQuickConfirm = async (aptId: string) => {
    try {
      const res = await fetch(`/api/appointments/${aptId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
        fetchStats();
        fetchAppointments();
      } else {
        alert(data.error || 'Erreur confirmation');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickComplete = async (aptId: string) => {
    if (!window.confirm('Marquer ce rendez-vous comme terminé ?')) return;
    try {
      const res = await fetch(`/api/appointments/${aptId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
        body: JSON.stringify({ notes: 'Clôturé depuis le tableau de bord' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
        fetchStats();
        fetchAppointments();
      } else {
        alert(data.error || 'Erreur clôture');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ouvrir la fiche détaillée
  const openDetail = (aptId: string) => {
    setSelectedDetailId(aptId);
    setIsDetailModalOpen(true);
  };

  // Ouvrir WhatsApp
  const openWhatsApp = (apt: any, template: string = 'confirmation_rendez_vous') => {
    setWhatsAppAppointment(apt);
    setWhatsAppTemplate(template);
    setIsWhatsAppModalOpen(true);
  };

  // Ouvrir Retrait
  const openRetrait = (apt: any) => {
    setRetraitAppointment(apt);
    setIsRetraitModalOpen(true);
  };

  // Rendu des lignes d'alerte
  const renderAlertCard = (apt: any, isUrgentLate: boolean = false) => {
    const timeFormatted = formatAppointmentTime(apt.heure_rendez_vous || apt.heure);
    const dateFormatted = formatAppointmentDate(apt.date_rendez_vous || apt.date);
    const clientNom = `${apt.client_nom || ''} ${apt.client_prenom || ''}`.trim();
    const solde = Number(apt.order_solde_restant) || 0;
    const isRetrait = apt.type_rendez_vous === 'RETRAIT_TRAVAIL';

    return (
      <div
        key={apt.id}
        className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isUrgentLate
            ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400'
            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold ${
              isUrgentLate
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[11px] leading-none">{timeFormatted}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-xs">{clientNom || 'Client'}</span>
              {apt.client_entreprise && (
                <span className="text-[11px] text-slate-500">({apt.client_entreprise})</span>
              )}
              <AppointmentTypeBadge type={apt.type_rendez_vous} />
              <AppointmentStatusBadge status={apt.statut} />
              {isUrgentLate && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                  EN RETARD
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
              <span>
                Travail :{' '}
                <strong className="text-slate-800">
                  {apt.order_titre || apt.motif || 'Travaux Canaan'}
                </strong>
              </span>
              <span>•</span>
              <span className="font-mono text-slate-700">
                {formatPhoneDisplay(apt.client_telephone || apt.client_whatsapp)}
              </span>
              {apt.order_id && (
                <>
                  <span>•</span>
                  <span>
                    Solde :{' '}
                    <strong className={solde > 0 ? 'text-amber-700 font-mono font-bold' : 'text-emerald-700 font-mono font-bold'}>
                      {formatCFA(solde)}
                    </strong>
                  </span>
                </>
              )}
              {apt.responsable && (
                <>
                  <span>•</span>
                  <span>Resp : <strong>{apt.responsable}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Boutons d'action rapide */}
        <div className="flex items-center gap-1.5 self-end md:self-center flex-wrap">
          <button
            onClick={() => openDetail(apt.id)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            title="Consulter la fiche"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            Voir
          </button>

          <button
            onClick={() => openWhatsApp(apt, isUrgentLate ? 'rendez_vous_manque' : 'rappel_rendez_vous_jour_j')}
            className="p-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1 transition-colors"
            title="Relancer / Rappeler sur WhatsApp"
          >
            <Send className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {apt.statut === 'A_CONFIRMER' && (
            <button
              onClick={() => handleQuickConfirm(apt.id)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmer
            </button>
          )}

          {isRetrait ? (
            <button
              onClick={() => openRetrait(apt)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Retirer
            </button>
          ) : (
            <button
              onClick={() => handleQuickComplete(apt.id)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminer
            </button>
          )}
        </div>
      </div>
    );
  };

  // Logique du Calendrier
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const base = new Date(currentCalendarDate);

    if (calendarViewType === 'jour') {
      days.push(new Date(base));
    } else if (calendarViewType === 'semaine') {
      const currentDay = base.getDay(); // 0 is Sunday, 1 is Monday
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(base);
      monday.setDate(base.getDate() + distanceToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
    } else if (calendarViewType === 'mois' || calendarViewType === 'agenda') {
      // 30 jours à partir du premier jour du mois
      const firstDayOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
      const startDay = firstDayOfMonth.getDay();
      const distance = startDay === 0 ? -6 : 1 - startDay;
      const startCalendar = new Date(firstDayOfMonth);
      startCalendar.setDate(firstDayOfMonth.getDate() + distance);

      for (let i = 0; i < 35; i++) {
        const d = new Date(startCalendar);
        d.setDate(startCalendar.getDate() + i);
        days.push(d);
      }
    }
    return days;
  }, [currentCalendarDate, calendarViewType]);

  const handlePrevCalendar = () => {
    const d = new Date(currentCalendarDate);
    if (calendarViewType === 'jour') d.setDate(d.getDate() - 1);
    else if (calendarViewType === 'semaine') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentCalendarDate(d);
  };

  const handleNextCalendar = () => {
    const d = new Date(currentCalendarDate);
    if (calendarViewType === 'jour') d.setDate(d.getDate() + 1);
    else if (calendarViewType === 'semaine') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentCalendarDate(d);
  };

  const handleTodayCalendar = () => {
    setCurrentCalendarDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* 1. Header principal */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-700/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Rendez-vous & Retraits Clients
                {(stats.today > 0 || stats.late > 0) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Bell className="w-3 h-3 text-amber-700 animate-bounce" />
                    {stats.today + stats.late} urgent(s)
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Planning d'atelier, gestion des retraits, validation de maquettes et automatisation des rappels WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleProcessReminders}
            disabled={isProcessingReminders}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all shadow-2xs disabled:opacity-60"
            title="Vérifier et expédier les rappels WhatsApp de la veille et du matin"
          >
            <Sparkles className={`w-4 h-4 text-emerald-600 ${isProcessingReminders ? 'animate-spin' : ''}`} />
            {isProcessingReminders ? 'Traitement en cours...' : 'Traiter rappels WhatsApp'}
          </button>

          <button
            onClick={() => {
              setAppointmentToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-700/20"
          >
            <Plus className="w-4 h-4" />
            Nouveau rendez-vous
          </button>
        </div>
      </div>

      {/* Rapport de traitement des rappels le cas échéant */}
      {reminderReport && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Traitement automatique des rappels terminé avec succès :</p>
              <p className="text-slate-600 mt-0.5">
                • <strong>{reminderReport.sentJ1Count || 0}</strong> rappel(s) J-1 expédié(s) pour demain.
                {' '}&bull;{' '}
                • <strong>{reminderReport.sentJourJCount || 0}</strong> rappel(s) Jour J expédié(s) pour aujourd'hui.
              </p>
            </div>
          </div>
          <button
            onClick={() => setReminderReport(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => {
            setTemporalQuickFilter('today');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            temporalQuickFilter === 'today'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Aujourd'hui</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{stats.today}</div>
          <span className="text-[11px] text-emerald-700 font-medium">À accueillir ce jour</span>
        </button>

        <button
          onClick={() => {
            setTemporalQuickFilter('tomorrow');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            temporalQuickFilter === 'tomorrow'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Demain</span>
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{stats.tomorrow}</div>
          <span className="text-[11px] text-blue-700 font-medium">Rappels J-1 prêts</span>
        </button>

        <button
          onClick={() => {
            setTemporalQuickFilter('late');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            temporalQuickFilter === 'late'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 font-bold">
            <span>En retard</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          </div>
          <div className={`text-2xl font-black mt-2 font-mono ${stats.late > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.late}
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Horaires dépassés</span>
        </button>

        <button
          onClick={() => {
            setTemporalQuickFilter('upcoming');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            temporalQuickFilter === 'upcoming'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>À venir</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{stats.upcoming}</div>
          <span className="text-[11px] text-slate-500">Planifiés plus tard</span>
        </button>

        <button
          onClick={() => {
            setTemporalQuickFilter('all');
            setSelectedStatus('TERMINE');
            setPage(1);
          }}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs text-left transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Terminés (Mois)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{stats.completedMonth}</div>
          <span className="text-[11px] text-emerald-800 font-medium">Retraits clôturés</span>
        </button>
      </div>

      {/* 3. Section ALERTES RENDEZ-VOUS (Prioritaire) */}
      {(lateApts.length > 0 || todayApts.length > 0 || tomorrowApts.length > 0) && (
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-700" />
              Alertes Rendez-vous Prioritaires
            </h2>
            <span className="text-xs text-slate-500">
              {todayApts.length} aujourd'hui • {tomorrowApts.length} demain • {lateApts.length} en retard
            </span>
          </div>

          {/* Sous-section EN RETARD */}
          {lateApts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                EN RETARD — {lateApts.length} rendez-vous non honoré(s)
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {lateApts.map((apt) => renderAlertCard(apt, true))}
              </div>
            </div>
          )}

          {/* Sous-section AUJOURD'HUI */}
          {todayApts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                AUJOURD'HUI — {todayApts.length} rendez-vous prévu(s)
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {todayApts.map((apt) => renderAlertCard(apt, false))}
              </div>
            </div>
          )}

          {/* Sous-section DEMAIN */}
          {tomorrowApts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                DEMAIN — {tomorrowApts.length} rendez-vous prévu(s)
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {tomorrowApts.map((apt) => renderAlertCard(apt, false))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Barre de sélection du mode (Liste vs Calendrier) & Filtres */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          {/* Switcher Liste / Calendrier */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTabMode('liste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTabMode === 'liste'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              Vue Liste ({totalCount})
            </button>
            <button
              onClick={() => setActiveTabMode('calendrier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTabMode === 'calendrier'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Vue Calendrier
            </button>
          </div>

          {/* Filtres rapides de statut temporel */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'today', label: "Aujourd'hui" },
              { key: 'tomorrow', label: 'Demain' },
              { key: 'late', label: 'En retard' },
              { key: 'upcoming', label: 'À venir' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setTemporalQuickFilter(f.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                  temporalQuickFilter === f.key
                    ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ligne des filtres de recherche */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Recherche texte */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher par client, travail, n° commande, motif..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>

          {/* Filtre Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Tous les types</option>
              {APPOINTMENT_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {APPOINTMENT_TYPES_MAP[k]?.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Statut */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="A_CONFIRMER">À confirmer</option>
              <option value="CONFIRME">Confirmé</option>
              <option value="TERMINE">Terminé / Retiré</option>
              <option value="ABSENT">Client absent</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>

          {/* Date spécifique */}
          <div>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                setTemporalQuickFilter('all');
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
              title="Filtrer sur une date précise"
            />
          </div>
        </div>
      </div>

      {/* 5. VUE LISTE */}
      {activeTabMode === 'liste' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Client & Contact</th>
                  <th className="py-3.5 px-4">Type & Objet</th>
                  <th className="py-3.5 px-4">Commande & Solde</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Rappels WhatsApp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      Chargement des rendez-vous...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">Aucun rendez-vous trouvé</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ajustez vos filtres ou créez un nouveau rendez-vous atelier.
                      </p>
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => {
                    const temporal = getAppointmentTemporalStatus({
                      date_rendez_vous: apt.date_rendez_vous || apt.date,
                      heure_rendez_vous: apt.heure_rendez_vous || apt.heure,
                      statut: apt.statut,
                    });
                    const isLate = temporal === 'LATE';
                    const solde = Number(apt.order_solde_restant) || 0;
                    const isRetrait = apt.type_rendez_vous === 'RETRAIT_TRAVAIL';

                    return (
                      <tr
                        key={apt.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isLate ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        {/* Date & Heure */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <strong className="text-slate-900 block font-mono text-xs">
                                {formatAppointmentTime(apt.heure_rendez_vous || apt.heure)}
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {formatAppointmentDate(apt.date_rendez_vous || apt.date)}
                              </span>
                            </div>
                            <AppointmentTemporalBadge temporalStatus={temporal} />
                          </div>
                        </td>

                        {/* Client */}
                        <td className="py-3 px-4">
                          <div>
                            {onOpenClientDetail ? (
                              <button
                                type="button"
                                onClick={() => onOpenClientDetail(apt.client_id)}
                                className="font-bold text-slate-900 hover:text-emerald-800 hover:underline flex items-center gap-1 text-xs"
                              >
                                {apt.client_nom} {apt.client_prenom || ''}
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            ) : (
                              <strong className="text-slate-900 text-xs">
                                {apt.client_nom} {apt.client_prenom || ''}
                              </strong>
                            )}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                              <span>{formatPhoneDisplay(apt.client_telephone || apt.client_whatsapp)}</span>
                              {apt.client_consentement && (
                                <span className="text-emerald-700" title="Consentement WhatsApp accordé">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type & Objet */}
                        <td className="py-3 px-4">
                          <AppointmentTypeBadge type={apt.type_rendez_vous} />
                          <span className="text-[11px] text-slate-600 block mt-1 line-clamp-1">
                            {apt.motif || apt.order_titre || '-'}
                          </span>
                        </td>

                        {/* Commande & Solde */}
                        <td className="py-3 px-4">
                          {apt.order_id ? (
                            <div>
                              {onOpenOrderDetail ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenOrderDetail(apt.order_id)}
                                  className="font-mono font-bold text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                                >
                                  {apt.order_numero || 'CMD-...'}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <span className="font-mono font-bold text-slate-800">
                                  {apt.order_numero || 'CMD-...'}
                                </span>
                              )}
                              <span
                                className={`block text-[11px] font-mono font-semibold ${
                                  solde > 0 ? 'text-amber-700' : 'text-emerald-700'
                                }`}
                              >
                                Solde : {formatCFA(solde)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Sans commande</span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="py-3 px-4">
                          <AppointmentStatusBadge status={apt.statut} />
                        </td>

                        {/* Suivi des Rappels */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                apt.confirmation_envoyee
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title="Confirmation immédiate à la prise de RDV"
                            >
                              Conf.
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                apt.rappel_j1_envoye
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title="Rappel J-1 (la veille)"
                            >
                              J-1
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                apt.rappel_jour_j_envoye
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title="Rappel Jour J (le matin)"
                            >
                              Jour J
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetail(apt.id)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                              title="Voir les détails complets"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openWhatsApp(apt)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              title="Envoyer un rappel WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {isRetrait && apt.statut !== 'TERMINE' && apt.statut !== 'ANNULE' && (
                              <button
                                onClick={() => openRetrait(apt)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs"
                                title="Enregistrer le retrait et le paiement éventuel"
                              >
                                Retirer
                              </button>
                            )}

                            {apt.statut === 'A_CONFIRMER' && (
                              <button
                                onClick={() => handleQuickConfirm(apt.id)}
                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                                title="Confirmer le rendez-vous"
                              >
                                Confirmer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} sur {totalPages} ({totalCount} résultats)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. VUE CALENDRIER (Jour, Semaine, Mois, Agenda) */}
      {activeTabMode === 'calendrier' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Header Calendrier */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-slate-900 capitalize">
                {currentCalendarDate.toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={handlePrevCalendar}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleTodayCalendar}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-slate-700 transition-colors"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={handleNextCalendar}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Switchers Type de vue Calendrier */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['jour', 'semaine', 'mois', 'agenda'] as const).map((vt) => (
                <button
                  key={vt}
                  onClick={() => setCalendarViewType(vt)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    calendarViewType === vt
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>

          {/* Grille du Calendrier */}
          {calendarViewType === 'agenda' ? (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Aucun rendez-vous planifié dans cette période.</p>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => openDetail(apt.id)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-center">
                        <span className="text-xs font-bold text-slate-500 uppercase block">
                          {new Date(apt.date_rendez_vous || apt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black text-slate-900 font-mono">
                          {new Date(apt.date_rendez_vous || apt.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-slate-900">
                            {formatAppointmentTime(apt.heure_rendez_vous || apt.heure)}
                          </strong>
                          <span className="text-xs font-semibold text-slate-800">
                            {apt.client_nom} {apt.client_prenom || ''}
                          </span>
                          <AppointmentTypeBadge type={apt.type_rendez_vous} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {apt.motif || apt.order_titre || 'Rendez-vous client'}
                        </p>
                      </div>
                    </div>
                    <AppointmentStatusBadge status={apt.statut} />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div
              className={`grid gap-2.5 ${
                calendarViewType === 'jour'
                  ? 'grid-cols-1'
                  : calendarViewType === 'semaine'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-7'
                  : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7'
              }`}
            >
              {calendarDays.map((day, idx) => {
                const dayStr = day.toISOString().slice(0, 10);
                const isToday = dayStr === getTodayStringCI();
                const dayApts = appointments.filter((a) => (a.date_rendez_vous || a.date) === dayStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[140px] p-2.5 rounded-2xl border flex flex-col justify-between ${
                      isToday
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-500 capitalize">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          isToday ? 'bg-emerald-600 text-white' : 'text-slate-800'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1.5 my-2 flex-1 overflow-y-auto max-h-[160px]">
                      {dayApts.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => openDetail(apt.id)}
                          className="w-full text-left p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-[11px] block"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-emerald-900 font-mono text-[10px]">
                              {formatAppointmentTime(apt.heure_rendez_vous || apt.heure)}
                            </strong>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                apt.statut === 'CONFIRME'
                                  ? 'bg-blue-500'
                                  : apt.statut === 'TERMINE'
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <span className="font-semibold text-slate-900 block truncate">
                            {apt.client_nom}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {apt.order_titre || apt.motif || apt.type_rendez_vous}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setAppointmentToEdit(null);
                        setIsFormModalOpen(true);
                      }}
                      className="w-full py-1 text-[10px] font-bold text-slate-500 hover:text-emerald-700 rounded hover:bg-white text-center transition-colors border border-dashed border-slate-300"
                    >
                      + RDV
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALES */}

      {/* Formulaire création / édition */}
      {isFormModalOpen && (
        <AppointmentFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          appointmentToEdit={appointmentToEdit}
          onSaved={() => {
            setIsFormModalOpen(false);
            fetchStats();
            fetchAlerts();
            fetchAppointments();
          }}
        />
      )}

      {/* Fiche détaillée rendez-vous */}
      {isDetailModalOpen && (
        <AppointmentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          appointmentId={selectedDetailId}
          onEdit={(apt) => {
            setIsDetailModalOpen(false);
            setAppointmentToEdit(apt);
            setIsFormModalOpen(true);
          }}
          onOpenClientDetail={onOpenClientDetail}
          onOpenOrderDetail={onOpenOrderDetail}
          onRefreshList={() => {
            fetchStats();
            fetchAlerts();
            fetchAppointments();
          }}
        />
      )}

      {/* Modale d'enregistrement du retrait */}
      {isRetraitModalOpen && (
        <AppointmentRetraitModal
          isOpen={isRetraitModalOpen}
          onClose={() => setIsRetraitModalOpen(false)}
          appointment={retraitAppointment}
          onRetraitCompleted={() => {
            setIsRetraitModalOpen(false);
            fetchStats();
            fetchAlerts();
            fetchAppointments();
          }}
          onOpenWhatsAppRemerciement={() => {
            openWhatsApp(retraitAppointment, 'remerciement_retrait');
          }}
        />
      )}

      {/* Modale WhatsApp */}
      {isWhatsAppModalOpen && (
        <AppointmentWhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          appointment={whatsAppAppointment}
          defaultTemplate={whatsAppTemplate}
          onSent={() => {
            fetchStats();
            fetchAlerts();
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
};
