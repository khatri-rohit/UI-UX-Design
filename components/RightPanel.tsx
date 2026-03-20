import React from 'react'
import { Button } from '@/components/ui/button'
import { Clock3, Layers3, Minus, Plus, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'

type RightPanelProps = {
    prompt: string
    zoomPercent: string
    isGenerating: boolean
    onPromptChange: (value: string) => void
    onGenerate: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
}

const RightPanel = ({
    prompt,
    zoomPercent,
    isGenerating,
    onPromptChange,
    onGenerate,
    onZoomIn,
    onZoomOut,
    onResetZoom,
}: RightPanelProps) => {
    const quickPrompts = [
        'Board-ready KPI dashboard with quarterly trend blocks',
        'Compliance-first admin console with audit timeline',
        'Operations cockpit with alerts, tasks, and status cards',
    ]

    return (
        <aside className='relative w-full border-t border-slate-300/70 bg-linear-to-b from-slate-950 to-slate-900 p-5 text-slate-100 md:h-screen md:w-100 md:border-t-0 md:border-l'>
            <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_65%)]' />

            <div className='relative flex h-full flex-col'>
                <div className='rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-[0_18px_38px_-26px_rgba(15,23,42,0.95)] backdrop-blur'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80'>Design Command</p>
                            <h2 className='mt-1 text-lg font-semibold text-white'>Enterprise Studio</h2>
                        </div>
                        <div className='inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-200'>
                            <ShieldCheck className='size-3.5' />
                            Secure
                        </div>
                    </div>

                    <div className='mt-4 grid grid-cols-2 gap-2'>
                        <div className='rounded-xl border border-slate-700 bg-slate-950/80 p-2.5'>
                            <div className='flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400'>
                                <Layers3 className='size-3.5' />
                                Layers
                            </div>
                            <p className='mt-1 text-sm font-semibold text-slate-100'>Canvas Active</p>
                        </div>
                        <div className='rounded-xl border border-slate-700 bg-slate-950/80 p-2.5'>
                            <div className='flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400'>
                                <Clock3 className='size-3.5' />
                                Last Action
                            </div>
                            <p className='mt-1 text-sm font-semibold text-slate-100'>Live Session</p>
                        </div>
                    </div>
                </div>

                <div className='mt-5 space-y-2'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400'>Prompt</p>
                    <textarea
                        value={prompt}
                        onChange={(event) => onPromptChange(event.target.value)}
                        placeholder='Describe the UI to generate for your product team...'
                        className='h-44 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/75 p-3.5 text-sm text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/20'
                    />
                </div>

                <div className='mt-3 flex flex-wrap gap-2'>
                    {quickPrompts.map((item) => (
                        <button
                            key={item}
                            type='button'
                            onClick={() => onPromptChange(item)}
                            className='rounded-full border border-slate-600/90 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-sky-400/60 hover:text-sky-200'
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <Button
                    onClick={onGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className='mt-4 h-11 rounded-xl bg-sky-500 text-sm font-semibold text-slate-950 shadow-[0_12px_24px_-14px_rgba(56,189,248,0.9)] hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-300'
                >
                    <Sparkles className='size-4' />
                    {isGenerating ? 'Generating Layout...' : 'Generate Enterprise UI'}
                </Button>

                {/* <div className='mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-4'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400'>Canvas Controls</p>
                    <p className='mt-2 text-sm text-slate-200'>Zoom: {zoomPercent}</p>

                    <div className='mt-3 grid grid-cols-3 gap-2'>
                        <Button variant='outline' onClick={onZoomOut} className='border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'>
                            <Minus className='size-4' />
                        </Button>
                        <Button variant='outline' onClick={onResetZoom} className='border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'>
                            <RotateCcw className='size-4' />
                        </Button>
                        <Button variant='outline' onClick={onZoomIn} className='border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'>
                            <Plus className='size-4' />
                        </Button>
                    </div>

                    <p className='mt-3 text-xs text-slate-400'>
                        Pan with middle mouse drag, or hold the spacebar while dragging.
                    </p>
                </div> */}

                <div className='mt-auto pt-5 text-[11px] text-slate-400'>
                    Enterprise-ready output with structured hierarchy, consistent spacing, and scalable component rhythm.
                </div>
            </div>
        </aside>
    )
}

export default RightPanel