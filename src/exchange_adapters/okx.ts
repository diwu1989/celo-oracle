import { BaseExchangeAdapter, ExchangeAdapter, ExchangeDataType, Ticker } from './base'

import { Exchange } from '../utils'

export class OKXAdapter extends BaseExchangeAdapter implements ExchangeAdapter {
  baseApiUrl = 'https://www.okx.com/api/v5'
  readonly _exchangeName = Exchange.OKX
  readonly _certFingerprint256 =
    '3A:BB:E6:3D:AF:75:6C:50:16:B6:B8:5F:52:01:5F:D8:E8:AC:BE:27:7C:50:87:B1:27:A6:05:63:A8:41:ED:8A'

  private static readonly tokenSymbolMap = OKXAdapter.standardTokenSymbolMap

  protected generatePairSymbol(): string {
    const base = OKXAdapter.tokenSymbolMap.get(this.config.baseCurrency)
    const quote = OKXAdapter.tokenSymbolMap.get(this.config.quoteCurrency)
    return `${base}-${quote}`
  }

  async fetchTicker(): Promise<Ticker> {
    const tickerJson = await this.fetchFromApi(
      ExchangeDataType.TICKER,
      `market/ticker?instId=${this.pairSymbol}`
    )

    return this.parseTicker(tickerJson)
  }

  /**
   *
   * @param json parsed response from bitstamps's ticker endpoint
   * https://www.okx.com/api/v5/market/ticker?instId=CELO-USDT
   * {
   * "code":"0",
   * "msg":"",
   * "data":[
   *  {
   *    "instType":"SPOT",
   *    "instId":"CELO-USDT",
   *    "last":"0.792",
   *    "lastSz":"193.723363",
   *    "askPx":"0.793",
   *    "askSz":"802.496954",
   *    "bidPx":"0.792",
   *    "bidSz":"55.216944",
   *    "open24h":"0.691",
   *    "high24h":"0.828",
   *    "low24h":"0.665",
   *    "volCcy24h":"1642445.37682",
   *    "vol24h":"2177089.719932",
   *    "ts":"1674479195109",
   *    "sodUtc0":"0.685",
   *    "sodUtc8":"0.698"
   *   }
   *  ]
   * }
   */
  parseTicker(json: any): Ticker {
    const ticker = {
      ...this.priceObjectMetadata,
      ask: this.safeBigNumberParse(json.data[0].askPx)!,
      baseVolume: this.safeBigNumberParse(json.data[0].vol24h)!,
      bid: this.safeBigNumberParse(json.data[0].bidPx)!,
      lastPrice: this.safeBigNumberParse(json.data[0].last)!,
      quoteVolume: this.safeBigNumberParse(json.data[0].volCcy24h)!,
      timestamp: this.safeBigNumberParse(json.data[0].ts)?.toNumber()!,
    }
    this.verifyTicker(ticker)
    return ticker
  }

  /**
   *
   * @param json parsed response from bitstamps's ticker endpoint
   * https://www.okx.com/api/v5/market/ticker?instId=CELO-USDT
   * {
   * "code":"0",
   * "msg":"",
   * "data":[
   *  {
   *    "instType":"SPOT",
   *    "instId":"CELO-USDT",
   *    "last":"0.792",
   *    "lastSz":"193.723363",
   *    "askPx":"0.793",
   *    "askSz":"802.496954",
   *    "bidPx":"0.792",
   *    "bidSz":"55.216944",
   *    "open24h":"0.691",
   *    "high24h":"0.828",
   *    "low24h":"0.665",
   *    "volCcy24h":"1642445.37682",
   *    "vol24h":"2177089.719932",
   *    "ts":"1674479195109",
   *    "sodUtc0":"0.685",
   *    "sodUtc8":"0.698"
   *   }
   *  ]
   * }
   * @returns bool
   */
  async isOrderbookLive(): Promise<boolean> {
    const response = await this.fetchFromApi(
      ExchangeDataType.ORDERBOOK_STATUS,
      `market/ticker?instId=${this.pairSymbol}`
    )

    return !!response && response.code === '0'
  }
}
