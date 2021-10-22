import { Exchange } from '../utils'
import { BaseExchangeAdapter, ExchangeAdapter, ExchangeDataType, Ticker, Trade } from './base'

export class NovaDaxAdapter extends BaseExchangeAdapter implements ExchangeAdapter {
  baseApiUrl = 'https://api.novadax.com/v1/market'
  readonly _exchangeName = Exchange.NOVADAX
  // Amazon root CA
  readonly _certFingerprint256 =
    '0B:BF:91:35:CE:4C:9B:16:FF:39:0D:DF:A2:00:F2:12:EB:AF:08:FA:65:A1:4F:DF:BD:E1:C5:E8:6E:00:68:2E'

  private static readonly tokenSymbolMap = NovaDaxAdapter.standardTokenSymbolMap

  protected generatePairSymbol(): string {
    return `${NovaDaxAdapter.tokenSymbolMap
      .get(this.config.baseCurrency)
      ?.toLowerCase()}_${NovaDaxAdapter.tokenSymbolMap.get(this.config.quoteCurrency)?.toLowerCase()}`
  }

  async fetchTicker(): Promise<Ticker> {
    const tickerJson = await this.fetchFromApi(
      ExchangeDataType.TICKER,
      `ticker?book=${this.pairSymbol}`
    )
    return this.parseTicker(tickerJson.payload)
  }

  async fetchTrades(): Promise<Trade[]> {
    const tradesJson = await this.fetchFromApi(
      ExchangeDataType.TRADE,
      `trades?book=${this.pairSymbol}`
    )
    return this.parseTrades(tradesJson.payload).sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   *
   * @param json parsed response from NovaDAX's ticker endpoint
   *
   * {
   *     "code": "A10000",
   *     "data": {
   *         "ask": "34708.15",
   *         "baseVolume24h": "34.08241488",
   *         "bid": "34621.74",
   *         "high24h": "35079.77",
   *         "lastPrice": "34669.81",
   *         "low24h": "34330.64",
   *         "open24h": "34492.08",
   *         "quoteVolume24h": "1182480.09502814",
   *         "symbol": "BTC_BRL",
   *         "timestamp": 1571112216346
   *     },
   *     "message": "Success"
   * }
   * 
   */
  parseTicker(json: any): Ticker {
    const data = json.data
    const lastPrice = this.safeBigNumberParse(data.lastPrice)!
    const baseVolume = this.safeBigNumberParse(data.baseVolume24h)!
    const quoteVolume = this.safeBigNumberParse(data.quoteVolume24h)!
    const ticker = {
      ...this.priceObjectMetadata,
      ask: this.safeBigNumberParse(data.ask)!,
      baseVolume,
      bid: this.safeBigNumberParse(data.bid)!,
      high: this.safeBigNumberParse(data.high24h),
      lastPrice,
      low: this.safeBigNumberParse(data.low24h),
      open: lastPrice,
      quoteVolume,
      timestamp: this.safeBigNumberParse(data.timestamp)?.toNumber()!,
    }
    this.verifyTicker(ticker)
    return ticker
  }

  /**
   *
   * @param json response from NovaDax's trades endpoint
   * 
   *  {
   *      "code": "A10000",
   *      "data": [
   *          {
   *              "price": "43657.57",
   *              "amount": "1",
   *              "side": "SELL",
   *              "timestamp": 1565007823401
   *          },
   *          {
   *              "price": "43687.16",
   *              "amount": "0.071",
   *              "side": "BUY",
   *              "timestamp": 1565007198261
   *          }
   *      ],
   *      "message": "Success"
   *  }
   * 
   */
  
  parseTrades(json: any): Trade[] {
    return json.data.map((trade: any) => {
      const price = this.safeBigNumberParse(trade.price)
      const amount = this.safeBigNumberParse(trade.amount)
      const normalizedTrade = {
        ...this.priceObjectMetadata,
        amount,
        cost: amount ? price?.times(amount) : undefined,
        // no trade id
        price,
        side: trade.side.toLowerCase(),
        timestamp: this.safeBigNumberParse(trade.created_at)!.toNumber(),
      }
      this.verifyTrade(normalizedTrade)
      return normalizedTrade
    })
  }

  /**
   * No endpoint available to check this from NovaDax.
   * @returns bool
   */
  async isOrderbookLive(): Promise<boolean> {
    return true
  }
}
