import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
  Eye,
  Printer,
  XCircle,
  X,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequestTypeIcon } from '@/components/StatusBadges';
import { useAppData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { matchesRequestSearch } from '@/components/ui/portal-search-bar';
import {
  REQUEST_TYPE_META,
  STATUS_META,
  exportRequestsToCsv,
  formatDate,
  formatPHP,
  getBossWaitReason,
  getSubtypeLabel,
  isReadyForBoss,
} from '@/lib/constants';
import type { FormRequest, RequestStatus, RequestType } from '@/types/database';

const ITEMS_PER_PAGE = 6;

const HEAD_CLASS =
  'p-4 font-medium text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap';

const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  approved: 'bg-green-50 text-green-700 border-green-200',
  paid: 'bg-teal-50 text-teal-700 border-teal-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  hr_endorsed: 'bg-violet-50 text-violet-700 border-violet-200',
  accounting_verified: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface EmployeeFormsDatatableProps {
  requests: FormRequest[];
  allowedTypes?: RequestType[];
  csvFilename?: string;
  emptyMessage?: string;
  showEmployee?: boolean;
  allowCancel?: boolean;
  externalQuery?: string;
  initialTypeFilter?: string;
  initialStatusFilter?: string;
  onQuickApprove?: (req: FormRequest) => void;
  quickApprovingId?: string | null;
  onQuickEndorse?: (req: FormRequest) => void;
  quickEndorsingId?: string | null;
  onQuickVerify?: (req: FormRequest) => void;
  quickVerifyingId?: string | null;
  onInspect: (req: FormRequest) => void;
}

export function EmployeeFormsDatatable({
  requests,
  allowedTypes,
  csvFilename = 'my-mediq-digital-forms.csv',
  emptyMessage = "You haven't submitted any digital forms yet.",
  showEmployee = false,
  allowCancel = true,
  externalQuery = '',
  initialTypeFilter = 'all',
  initialStatusFilter = 'all',
  onQuickApprove,
  quickApprovingId = null,
  onQuickEndorse,
  quickEndorsingId = null,
  onQuickVerify,
  quickVerifyingId = null,
  onInspect,
}: EmployeeFormsDatatableProps) {
  const { performReview } = useAppData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const typeChoices: RequestType[] = allowedTypes ?? [
    'leave',
    'overtime',
    'reimbursement',
    'official_business',
    'cash_advance',
    'other',
  ];

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter !== 'all' && r.request_type !== typeFilter) return false;
      if (statusFilter === 'open') {
        if (
          r.boss_status === 'approved' ||
          !['pending', 'hr_endorsed', 'accounting_verified'].includes(r.status)
        )
          return false;
      } else if (statusFilter === 'ready_for_boss') {
        if (!isReadyForBoss(r)) return false;
      } else if (statusFilter === 'stage1_review') {
        if (
          r.boss_status !== 'pending' ||
          ['rejected', 'cancelled'].includes(r.status) ||
          isReadyForBoss(r)
        )
          return false;
      } else if (statusFilter === 'boss_approved') {
        if (r.boss_status !== 'approved') return false;
      } else if (statusFilter === 'approved_or_paid') {
        if (!['approved', 'paid'].includes(r.status)) return false;
      } else if (statusFilter !== 'all' && r.status !== (statusFilter as RequestStatus)) {
        return false;
      }
      if (externalQuery.trim() && !matchesRequestSearch(r, externalQuery)) return false;
      if (search.trim() && !matchesRequestSearch(r, search)) return false;
      return true;
    });
  }, [requests, search, externalQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, externalQuery, typeFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const currentItems = useMemo(
    () =>
      filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage]
  );

  const allOnPageSelected =
    currentItems.length > 0 && currentItems.every((item) => selectedIds.includes(item.id));

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIdSet = new Set(currentItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentItems.map((i) => i.id)])));
    }
  };

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const handleExport = () => {
    const source =
      selectedIds.length > 0
        ? filtered.filter((r) => selectedIds.includes(r.id))
        : filtered;

    exportRequestsToCsv(
      csvFilename,
      source.map((r) => ({
        reference_no: r.reference_no,
        employee_name: r.employee?.full_name ?? '',
        employee_code: r.employee?.employee_code ?? '',
        department: r.employee?.department ?? '',
        request_type: REQUEST_TYPE_META[r.request_type].label,
        subtype: getSubtypeLabel(r.request_type, r.subtype),
        title: r.title,
        status: r.status,
        start_date: r.start_date ?? r.expense_date ?? '',
        end_date: r.end_date ?? '',
        total_days: r.total_days != null ? String(r.total_days) : '',
        total_hours: r.total_hours != null ? String(r.total_hours) : '',
        amount: r.amount != null ? String(r.amount) : '',
        receipt_or_number: r.receipt_or_number ?? '',
        disbursement_reference: r.disbursement_reference ?? '',
        created_at: r.created_at,
      }))
    );
  };

  const handleCancelRequest = async (req: FormRequest) => {
    setCancellingId(req.id);
    try {
      await performReview({
        requestId: req.id,
        action: 'cancel',
        remarks: 'Cancelled by employee',
      });
      toast('Request cancelled', `${req.reference_no} has been cancelled.`);
    } catch (err) {
      toast(
        'Cannot cancel',
        err instanceof Error ? err.message : 'Unable to cancel this form.',
        'error'
      );
    } finally {
      setCancellingId(null);
    }
  };

  const startIdx = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      {/* Datatable-1 Toolbar */}
      <CardHeader className="gap-0 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2.5">
            <InputGroup className="max-w-sm">
              <InputGroupAddon align="inline-start">
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  showEmployee
                    ? 'Search employee, ref #, form type, OR #, status...'
                    : 'Search ref #, form type, subject, OR #, status...'
                }
                className="text-xs"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            {selectedIds.length > 0 && (
              <Badge
                variant="secondary"
                className="hidden gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex"
              >
                {selectedIds.length} selected
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs cursor-pointer">
                  <SlidersHorizontal className="size-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Filter Digital Forms</p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('all');
                        setStatusFilter('all');
                      }}
                      className="text-[11px] font-semibold text-[#163362] hover:underline dark:text-[#e6d8bf]"
                    >
                      Reset all
                    </button>
                  )}
                </div>
                <Separator />
                {typeChoices.length > 1 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dt-type-filter">Form Type</Label>
                    <select
                      id="dt-type-filter"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="all">All Form Types</option>
                      {typeChoices.map((t) => (
                        <option key={t} value={t}>
                          {REQUEST_TYPE_META[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="dt-status-filter">Approval Status</Label>
                  <select
                    id="dt-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="boss_approved">Boss Approved (Locked History)</option>
                    <option value="ready_for_boss">Ready for Boss Sign-Off</option>
                    <option value="stage1_review">In HR / Accounting Review</option>
                    <option value="open">Pending / In Review</option>
                    <option value="approved_or_paid">Approved &amp; Paid</option>
                    <option value="pending">Pending Only</option>
                    <option value="hr_endorsed">HR Endorsed</option>
                    <option value="accounting_verified">Accounting Verified</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Disbursed / Paid</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={handleExport}
              className="h-9 gap-1.5 text-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              {selectedIds.length > 0 ? `Export (${selectedIds.length})` : 'Export CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Datatable-1 Body */}
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileSpreadsheet className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{emptyMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              File any digital form above and it will appear here in real time.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12 p-4">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAllOnPage}
                      aria-label="Select all forms on this page"
                    />
                  </TableHead>
                  <TableHead className={HEAD_CLASS}>Form / Subject</TableHead>
                  {showEmployee && <TableHead className={HEAD_CLASS}>Employee</TableHead>}
                  <TableHead className={HEAD_CLASS}>Type</TableHead>
                  <TableHead className={HEAD_CLASS}>Dates / Value</TableHead>
                  <TableHead className={`${HEAD_CLASS} text-center`}>Status</TableHead>
                  <TableHead className={HEAD_CLASS}>Filed Date</TableHead>
                  <TableHead className={`${HEAD_CLASS} text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((req) => {
                  const meta = REQUEST_TYPE_META[req.request_type];
                  const statusMeta = STATUS_META[req.status];
                  const isOpen = ['pending', 'hr_endorsed', 'accounting_verified'].includes(
                    req.status
                  );
                  const isSelected = selectedIds.includes(req.id);

                  return (
                    <TableRow
                      key={req.id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => onInspect(req)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell
                        className="p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(req.id)}
                          aria-label={`Select ${req.reference_no}`}
                        />
                      </TableCell>

                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 bg-muted">
                            <AvatarFallback className={`${meta.bgSoft} text-white`}>
                              <RequestTypeIcon type={req.request_type} className="size-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 max-w-[260px]">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-foreground">
                                {req.title}
                              </span>
                              {req.priority === 'urgent' && (
                                <AlertTriangle className="size-3.5 shrink-0 text-rose-500" />
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono font-semibold text-foreground/75">
                                {req.reference_no}
                              </span>
                              <span>·</span>
                              <span className="truncate">
                                {getSubtypeLabel(req.request_type, req.subtype)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {showEmployee && (
                        <TableCell className="p-4 text-xs">
                          <div className="font-medium text-foreground">
                            {req.employee?.full_name ?? 'Staff Member'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {req.employee?.department ?? ''}
                          </div>
                        </TableCell>
                      )}

                      <TableCell className="p-4 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{meta.shortLabel}</div>
                        <div className="text-[11px]">{meta.routedTo}</div>
                      </TableCell>

                      <TableCell className="p-4 text-xs">
                        {req.amount != null ? (
                          <div>
                            <div className="font-semibold text-emerald-700">
                              {formatPHP(req.amount)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {req.expense_date
                                ? formatDate(req.expense_date)
                                : req.metadata?.liquidation_date
                                  ? `Liq: ${formatDate(req.metadata.liquidation_date)}`
                                  : meta.formCode}
                            </div>
                          </div>
                        ) : req.total_hours != null ? (
                          <div>
                            <div className="font-semibold text-indigo-700">
                              {req.total_hours} hrs
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatDate(req.start_date)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-foreground">
                              {formatDate(req.start_date)}
                              {req.end_date && req.end_date !== req.start_date
                                ? ` – ${formatDate(req.end_date)}`
                                : ''}
                            </div>
                            {req.total_days != null && (
                              <div className="text-[11px] font-semibold text-sky-700">
                                {req.total_days}{' '}
                                {Number(req.total_days) === 1 ? 'day' : 'days'}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`px-2.5 py-0.5 font-semibold ${STATUS_BADGE_CLASSES[req.status]}`}
                          >
                            {statusMeta.label}
                          </Badge>
                          {req.boss_status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#163362]/10 px-2 py-0.5 text-[10px] font-bold text-[#163362] dark:bg-[#e6d8bf]/15 dark:text-[#e6d8bf]">
                              <Lock className="size-2.5" />
                              Locked · History
                            </span>
                          ) : getBossWaitReason(req) ? (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {getBossWaitReason(req)}
                            </span>
                          ) : isReadyForBoss(req) ? (
                            <span className="text-[10px] font-semibold text-[#163362] dark:text-[#e6d8bf]">
                              Ready for Boss
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap p-4 text-xs text-muted-foreground">
                        {formatDate(req.created_at)}
                      </TableCell>

                      <TableCell
                        className="p-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs cursor-pointer"
                            >
                              Actions
                              <ChevronDown className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                className="cursor-pointer py-2"
                                onClick={() => onInspect(req)}
                              >
                                <Eye className="size-3.5 text-sky-600" />
                                View Digital Slip
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer py-2"
                                onClick={() => {
                                  onInspect(req);
                                  setTimeout(() => window.print(), 250);
                                }}
                              >
                                <Printer className="size-3.5 text-slate-600" />
                                Print / Save PDF
                              </DropdownMenuItem>
                              {req.boss_status === 'approved' ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled
                                    className="py-2 text-[11px] font-semibold text-muted-foreground"
                                  >
                                    <Lock className="size-3.5" />
                                    Locked in History (Read-Only)
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  {onQuickVerify &&
                                    req.accounting_status === 'pending' &&
                                    !['rejected', 'cancelled'].includes(req.status) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          disabled={quickVerifyingId === req.id}
                                          onClick={() => onQuickVerify(req)}
                                          className="cursor-pointer py-2 font-semibold text-teal-700 focus:text-teal-700"
                                        >
                                          <CheckCircle2 className="size-3.5" />
                                          {quickVerifyingId === req.id
                                            ? 'Sending to Boss...'
                                            : 'Approve & Send to Boss'}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  {onQuickEndorse &&
                                    req.hr_status === 'pending' &&
                                    !['rejected', 'cancelled'].includes(req.status) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          disabled={quickEndorsingId === req.id}
                                          onClick={() => onQuickEndorse(req)}
                                          className="cursor-pointer py-2 font-semibold text-sky-700 focus:text-sky-700"
                                        >
                                          <CheckCircle2 className="size-3.5" />
                                          {quickEndorsingId === req.id
                                            ? 'Sending to Boss...'
                                            : 'Approve & Send to Boss'}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  {onQuickApprove && isReadyForBoss(req) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          disabled={quickApprovingId === req.id}
                                          onClick={() => onQuickApprove(req)}
                                          className="cursor-pointer py-2 font-semibold text-emerald-700 focus:text-emerald-700"
                                        >
                                          <CheckCircle2 className="size-3.5" />
                                          {quickApprovingId === req.id
                                            ? 'Approving...'
                                            : '1-Click Boss Approve'}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  {allowCancel && isOpen && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        disabled={cancellingId === req.id}
                                        onClick={() => handleCancelRequest(req)}
                                        className="cursor-pointer py-2 text-destructive focus:text-destructive"
                                      >
                                        <XCircle className="size-3.5" />
                                        {cancellingId === req.id
                                          ? 'Cancelling...'
                                          : 'Cancel Request'}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Datatable-1 Pagination Footer */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:px-5">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIdx}</span> to{' '}
                <span className="font-semibold text-foreground">{endIdx}</span> of{' '}
                <span className="font-semibold text-foreground">{filtered.length}</span> digital{' '}
                {filtered.length === 1 ? 'form' : 'forms'}
              </p>

              <ButtonGroup>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 gap-1 px-2.5 text-xs cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1
                  )
                  .map((p) => (
                    <Button
                      key={p}
                      variant={p === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className="h-8 min-w-8 px-2.5 text-xs cursor-pointer"
                    >
                      {p}
                    </Button>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 gap-1 px-2.5 text-xs cursor-pointer"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </ButtonGroup>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default EmployeeFormsDatatable;
