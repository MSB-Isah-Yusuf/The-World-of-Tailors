# The World of Tailors ERD

```mermaid
erDiagram
  User ||--o{ TailorProfile : has
  User ||--o{ SellerProfile : has
  User ||--o{ CustomerProfile : has
  TailorProfile ||--o{ Design : owns
  Design ||--o{ DesignImage : has
  SellerProfile ||--o{ FabricProduct : owns
  FabricProduct ||--o{ FabricProductImage : has
  FabricProduct ||--o{ FabricOrderItem : ordered
  User ||--o{ TailoringBooking : customer
  TailorProfile ||--o{ TailoringBooking : tailor
  Design ||--o{ TailoringBooking : design
  TailoringBooking ||--o{ BookingStatusHistory : history
  TailoringBooking ||--o{ BookingNote : notes
  User ||--o{ FabricOrder : customer
  SellerProfile ||--o{ FabricOrder : seller
  FabricOrder ||--o{ FabricOrderItem : items
  FabricOrder ||--o{ Delivery : deliveries
  TailoringBooking ||--o{ Delivery : deliveries
  Delivery ||--o{ DeliveryStatusHistory : history
  User ||--o{ MeasurementProfile : has
  MeasurementProfile ||--o{ MeasurementValue : values
  User ||--o{ CustomerAddress : has
  User ||--o{ Cart : has
  Cart ||--o{ CartItem : items
  User ||--o{ Review : writes
  User ||--o{ Favorite : has
  User ||--o{ Notification : receives
  User ||--o{ AuditLog : actor
```

Constraints: unique email, unique business slugs, FKs, monetary precision (Float for SQLite, Decimal for Postgres prod), positive quantities, status history, inventory movement audit.
