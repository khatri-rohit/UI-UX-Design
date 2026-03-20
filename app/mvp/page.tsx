"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import RightPanel from '@/components/RightPanel';
import { TLComponents, type Editor, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
    Grid: ({ size, ...camera }) => {
        const editor = useEditor()
        const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [])
        const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [])
        const canvas = useRef<HTMLCanvasElement>(null)

        useLayoutEffect(() => {
            if (!canvas.current) return

            const canvasW = screenBounds.w * devicePixelRatio
            const canvasH = screenBounds.h * devicePixelRatio

            canvas.current.width = canvasW
            canvas.current.height = canvasH

            const ctx = canvas.current.getContext('2d')
            if (!ctx) return

            ctx.clearRect(0, 0, canvasW, canvasH)

            const pageViewportBounds = editor.getViewportPageBounds()
            const startPageX = Math.ceil(pageViewportBounds.minX / size) * size
            const startPageY = Math.ceil(pageViewportBounds.minY / size) * size
            const endPageX = Math.floor(pageViewportBounds.maxX / size) * size
            const endPageY = Math.floor(pageViewportBounds.maxY / size) * size
            const numRows = Math.round((endPageY - startPageY) / size)
            const numCols = Math.round((endPageX - startPageX) / size)

            const majorDot = '#505050'
            const majorStep = 3.5
            const majorRadius = 2 * devicePixelRatio

            for (let row = 0; row <= numRows; row += majorStep) {
                const pageY = startPageY + row * size
                const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio

                for (let col = 0; col <= numCols; col += majorStep) {
                    const pageX = startPageX + col * size
                    const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio

                    ctx.beginPath()
                    ctx.fillStyle = majorDot
                    ctx.arc(canvasX, canvasY, majorRadius, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
        }, [camera, devicePixelRatio, editor, screenBounds, size])

        return <canvas className="tl-grid" ref={canvas} />
    },
}

const StudioPage = () => {
    const [editor, setEditor] = useState<Editor | null>(null)
    const [prompt, setPrompt] = useState('Design a clean dashboard for analytics with cards and charts')
    const [isGenerating, setIsGenerating] = useState(false)
    const [zoomPercent, setZoomPercent] = useState('100%')

    useEffect(() => {
        if (!editor) return

        const syncZoom = () => {
            setZoomPercent(`${Math.round(editor.getZoomLevel() * 100)}%`)
        }

        syncZoom()
        const interval = window.setInterval(syncZoom, 200)

        return () => {
            window.clearInterval(interval)
        }
    }, [editor])

    const handleGenerate = () => {
        if (!prompt.trim()) return

        setIsGenerating(true)

        // Placeholder generation behavior until an AI endpoint is connected.
        setTimeout(() => {
            setIsGenerating(false)
        }, 900)
    }

    const handleZoomIn = () => {
        if (!editor) return
        editor.zoomIn()
        setZoomPercent(`${Math.round(editor.getZoomLevel() * 100)}%`)
    }

    const handleZoomOut = () => {
        if (!editor) return
        editor.zoomOut()
        setZoomPercent(`${Math.round(editor.getZoomLevel() * 100)}%`)
    }

    const handleResetZoom = () => {
        if (!editor) return
        editor.resetZoom()
        setZoomPercent(`${Math.round(editor.getZoomLevel() * 100)}%`)
    }

    const handleMount = (mountedEditor: Editor) => {
        setEditor(mountedEditor)
        mountedEditor.updateInstanceState({ isGridMode: true })
    }

    return (
        <div className="relative flex h-screen w-full flex-col-reverse overflow-hidden bg-slate-950 md:flex-row">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_82%_10%,rgba(148,163,184,0.12),transparent_32%)]" />

            <div className="relative h-full min-h-[45vh] flex-1 md:min-h-0">
                <div className="relative h-full overflow-hidden border border-slate-700/70 bg-slate-900/80 shadow-[0_32px_60px_-38px_rgba(15,23,42,0.9)] backdrop-blur">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-slate-700/80 bg-slate-950/70 px-4 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-400" />
                            Design Surface
                        </div>
                        <div>Zoom {zoomPercent}</div>
                    </div>

                    <div className="h-full pt-12">
                        <Tldraw hideUi components={components} onMount={handleMount} />
                    </div>
                </div>
            </div>
            <RightPanel
                prompt={prompt}
                isGenerating={isGenerating}
                zoomPercent={zoomPercent}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
            />
        </div>
    )
}

export default StudioPage
