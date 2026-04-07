# Auto Service Platform V5 — Product Requirements

## Vision
Intelligent auto service marketplace that proposes solutions, not just lists options.
**V5 Focus: Market Control through Quick Request + Provider Pressure + Dynamic Commission**

## Architecture
- **Frontend**: Expo Router (React Native)
- **Backend**: NestJS + FastAPI Proxy → MongoDB
- **Engines**: Smart Matching, Visibility, Commission, Suspicious Detection, Quick Request

## Core UX Flow (V5 — 1-TAP)
```
Home → Quick Request (1 tap) → Instant Matching → Confirm → Booking
      ↓
  Repeat → Back to Quick Request
```

## V5 Features

### 🔥 P0 — QUICK REQUEST (1 TAP)
**Status: IMPLEMENTED**

- **Quick Request Screen** (`/quick-request`) — "Что случилось?"
  - Service chips: Не заводится, Замена масла, Тормоза, Диагностика, Срочно, Подвеска, Электрика, Другое
  - 1 tap → auto-create quote → auto-geo → instant matching
  
- **Quick Matching Screen** (`/quick-matching`) — Instant results
  - Top 3 providers with matching scores
  - Badges: Проверенный, Популярный, Сегодня, Выезд, Быстро
  - "Почему этот мастер" reasons
  - Boost priority for paying providers
  
- **Quick Confirm Screen** (`/quick-confirm`) — Fast booking
  - Provider details with match score
  - Price estimate
  - 1-tap confirm

- **Quick Success Screen** (`/quick-success`) — What's next
  - Next steps info
  - Links to My Quotes

### 2. Smart Matching Engine
- `findTopMatches()` — serviceFit(30%) + geoFit(20%) + availability(15%) + trust(15%) + speed(10%) + price(5%) + repeat(5%)
- Boost priority for paying providers
- Reasons generation

### 3. Provider Control System
- visibilityScore
- commission calculation
- suspiciousScore for bypass detection

## API Endpoints (V5 Quick Request)
- `POST /api/quotes/quick` — Create quick request + instant matching
- `GET /api/quotes/quick/types` — Get service types
- `GET /api/matching/nearby` — Find nearby providers
- `POST /api/matching/providers` — Advanced matching

## Tech Stack
- React Native (Expo) + TypeScript
- NestJS + FastAPI (Proxy) + MongoDB
- expo-location, expo-router

## Test Credentials
- **Customer**: customer@test.com / Customer123!
- **Provider**: provider@test.com / Provider123!
- **Admin**: admin@autoservice.com / Admin123!

## 🔥 P0 — OPERATOR MODE (CRITICAL FOR LAUNCH)

### ТЫ = ОПЕРАТОР
До автоматизации — ручной flow:
1. Клиент пишет → создаёшь заявку
2. Кидаешь 3 мастерам
3. Кто ответил → отдаёшь клиенту
4. Закрываешь заказ

### Admin APIs (Operator Mode)
- `POST /api/admin/quotes/manual` — Create quote manually
- `GET /api/admin/quotes/all` — All quotes with tracking
- `POST /api/admin/quotes/:id/distribute` — Send to providers
- `POST /api/admin/quotes/:id/close` — Close with provider
- `GET /api/admin/providers/:id/metrics` — Behavioral metrics
- `GET /api/admin/metrics/market` — Market health
- `GET /api/admin/metrics/response` — Response time metrics

### Behavioral Score System (Rank = Behavior, NOT Money)
- Fast response (< 2 min) → +10 score
- Normal response (2-10 min) → +5 score
- Ignored quote → -5 score
- Completed booking → +15 score
- Good review → +5 score

**Tiers:**
- Bronze: 0-49
- Silver: 50-69
- Gold: 70-84
- Platinum: 85-100

**Earned Boost:** Score >= 70 OR 10+ fast responses = FREE BOOST

### Key Metrics to Track
1. **Response Time** — < 10 min = market alive
2. **Match Rate** — 3/5 requests → deal
3. **Repeat** — customer returns

## P1 Features (IMPLEMENTED)

### Provider Pressure UI
- `/provider-dashboard` — Full pressure stats dashboard
  - 🔴 "Вы теряете заказы" — missed requests alert
  - 🟡 Health Score (0-100) — breakdown by response speed, rating, completion
  - 🟢 Nearby opportunities (FOMO)
  - 💰 Commission breakdown with reduction tips
  - 🚀 Boost status

### Boost System
- `/provider-boost` — Boost activation screen
  - 3 plans: Basic, Pro, Premium
  - Benefits list per plan
  - Activate button with API integration

### Backend APIs
- `GET /api/organizations/:id/pressure` — Full pressure stats
- `GET /api/organizations/:id/commission` — Commission breakdown
- `GET /api/organizations/boost/plans` — Available boost plans
- `POST /api/organizations/:id/boost/activate` — Activate boost


## 🗺️ P0 — MAP DECISION LAYER (V5)
**Status: IMPLEMENTED**

### Концепция
Карта = Decision Layer, не просто пины.
"Кто мне сейчас лучше всего подходит?" — не "покажи всех рядом"

### 3 Режима карты
1. **Explore (Обзор)** — Просто смотреть мастеров рядом
2. **Quick Request (Быстрый подбор)** — После заявки: только релевантные мастера + reasons + приоритет
3. **Direct** — (будущее) Маршрут + ETA к выбранному мастеру

## 🔥 DIRECT MODE — CONVERSION LAYER (V5.1)
**Status: IMPLEMENTED**

### Концепция
Direct Mode = экран "замыкания сделки"
"Нашёл мастера → выбрал → записался" — без мыслей, без friction

### Entry Points
- Map → "Выбрать" → Direct Mode
- Quick Matching → "Выбрать" → Direct Mode
- Favorites → "Выбрать" → Direct Mode

### Backend API
`GET /api/map/direct?providerId=X&lat=Y&lng=Z`

**Response:**
```json
{
  "provider": { id, name, rating, reviewsCount, isVerified, ... },
  "distanceKm": 1.2,
  "etaMinutes": 6,
  "reasons": ["Очень близко", "Проверенный мастер", ...],
  "availableSlots": ["2026-04-07T14:00:00.000Z", ...],
  "hasSlotsToday": true,
  "nextAvailableSlot": "..."
}
```

### Frontend (direct.tsx)
**Структура:**
1. **HEADER** — название + рейтинг + match score
2. **WHY** — "Почему этот мастер" (reasons)
3. **MAP MINI** — визуализация маршрута (ты → мастер)
4. **SLOTS** — сетка слотов (сегодня/завтра)
5. **CTA** — "Записаться за 1 клик"

### 🔥 Conversion Features
- **Auto-select первый слот** — уменьшает friction
- **Urgency banner** — "2 мастера доступны сейчас"
- **CTA пульсация** — визуальный акцент
- **mode параметр**:
  - `quick_request` → "Лучший мастер для вас"
  - `explore` → "Выбор мастера"

### Fallback UX
- Нет слотов сегодня → показать завтрашние
- Ошибка → "Повторить" + "Быстрая заявка"

### Backend Map API
- `GET /api/map/providers/nearby` — Поиск по радиусу + decision score sorting
- `GET /api/map/providers/viewport` — Провайдеры в bounding box ($geoWithin)
- `GET /api/map/providers/matching` — Decision Layer: urgency boost + лучшие match

### Decision Score
```
decisionScore = matchingScore * 0.7 + visibilityScore * 0.3
matchingScore = distance(25) + visibility(20) + rating(15) + speed(10) + base(40)
```

### MapProvider DTO
```
{ id, name, lat, lng, distanceKm, rating, reviewsCount, isVerified, isPopular, isMobile,
  hasAvailableSlotsToday, avgResponseTimeMinutes, visibilityScore, matchingScore,
  specializations[], reasons[], pinType }
```

### Фильтры
- Все | Сегодня | Быстро | Проверенные | Выезд

### Fallback UX
- Нет гео → показать Киев (50.45, 30.52)
- Нет данных → skeleton loading
- Нет мастеров → "Мастеров не найдено" + "Сбросить фильтры"

### Frontend (map.tsx)
- Полная переписка в V5 Decision Layer
- Dark theme (Monobank-inspired)
- Mode toggle (Обзор / Быстрый подбор)
- Provider cards: avatar, name, rating, distance, response time, matchingScore, badges, "Почему этот мастер", specializations, CTA
- Bottom sheet при тапе: провайдер details + "Выбрать мастера" + "Быстрая заявка"

### MongoDB Geo
- `organizations.location: { type: "Point", coordinates: [lng, lat] }`
- `2dsphere` index на organizations.location и branches.location
- 8 тестовых провайдеров в Киеве

## 🔥 CONVERSION ENGINE (V5.2)
**Status: IMPLEMENTED**

### 4 Слоя Конверсии:

#### 1. URGENCY (давление временем)
- "Осталось 2 мастера рядом"
- "Слот 14:00 могут занять"
- "Один может уехать через 5 мин"

#### 2. SOCIAL PROOF (доверие)
- "96% клиентов довольны"
- "124 заказа за месяц"
- "12 человек выбрали сегодня"

#### 3. DEFAULT DECISION (убирает friction)
- Auto-select первый слот
- Мастер уже выбран системой
- 1 клик = запись

#### 4. FRICTION KILLER
- 1 мастер → 1 слот → 1 кнопка
- CTA пульсирует
- Минимум текста

### AUTO-CONVERSION Flow:
```
Quick Request
  → система выбирает топ мастера
  → сразу Direct Mode (без списка!)
  → CTA "Записаться за 1 клик"
```
**Result**: +30-50% конверсии

### Provider Pressure UI:
- "Вы пропустили 3 заявки сегодня"
- "Ваш рейтинг падает"
- Health Score с breakdown
- Boost CTA

### Метрики для отслеживания:
1. **Conversion Rate**: Direct → CTA click
2. **Time to Decision**: секунды до клика
3. **Match Success**: заявка → сделка

