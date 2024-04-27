# business-time-calculator

Business Time Calculator is a simple tool to calculate the business time between two dates.

- It is useful for calculating the time between two dates, excluding weekends and holidays.
- It is configurable to exclude holidays and weekends.
- It can be used also with dates expressed in different timezones.

## Usage

```typescript
import { BusinessTime } from 'business-time-calculator';
import { DateTime } from 'luxon';

const businessTimeHelper = new BusinessTime({
  businessDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  businessTimezone: 'Europe/Rome',
  holidays: ['25/12', '01/01'],
  businessHours: [9, 18],
});

let newDT: DateTime = businessTimeHelper.addBusinessHoursToDate({ datetime: DateTime.now(), hours: 1 });
newDT: DateTime = businessTimeHelper.removeBusinessSecondsFromDate({ datetime: DateTime.now(), seconds: 120 });
const isBusinessDay: boolean = businessTimeHelper.isBusinessDay(DateTime.fromISO('2025-12-25'));
const businessDays: number = businessTimeHelper.computeBusinessDaysInInterval({ start: DateTime.now(), end: DateTime.now().plus({ days: 1 }) });
const workingHours: number = businessTimeHelper.computeWorkingHours();
```
