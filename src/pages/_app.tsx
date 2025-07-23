import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { StarknetProvider } from '@/components/starknet-provider'
import { NetworkProvider } from '@/contexts/NetworkContext'
import dynamic from 'next/dynamic'

// 使用 dynamic import 加载客户端专用组件
const ClientOnlyWindowExposer = dynamic(
  () => import('@/components/ClientOnlyWindowExposer'),
  { 
    ssr: false,
    loading: () => null // 不显示加载状态，因为这是后台组件
  }
)

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NetworkProvider>
      <StarknetProvider>
        <ClientOnlyWindowExposer />
        <Component {...pageProps} />
      </StarknetProvider>
    </NetworkProvider>
  )
}
