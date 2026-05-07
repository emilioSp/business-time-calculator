export const DayOfWeek = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

export type DAY_OF_WEEK = keyof typeof DayOfWeek;

export type Holiday = `${3 | 2 | 1 | 0}${number}/${1 | 0}${number}`; // e.g. 31/12, 01/01

const WEEKDAYS: DAY_OF_WEEK[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export class BusinessTime {
  private businessTimezone: string;
  private businessDays: DAY_OF_WEEK[];
  private holidays: Holiday[];
  private startHour: number;
  private endHour: number;

  static computeWorkingHours = (startHour: number, endHour: number) => {
    if (endHour < startHour) {
      return Math.abs(Math.abs(startHour - 24) + endHour);
    }
    return endHour - startHour;
  };

  constructor({
    businessTimezone,
    businessDays,
    businessHours,
    holidays,
  }: {
    businessTimezone: string;
    businessDays: DAY_OF_WEEK[];
    businessHours: number[];
    holidays: Holiday[];
  }) {
    this.businessTimezone = businessTimezone;
    this.businessDays = businessDays;
    this.holidays = holidays;
    this.startHour = businessHours[0];
    this.endHour = businessHours[1];
  }

  private setToStartOfDay(dt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    return dt.with({
      hour: this.startHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  private setToEndOfDay(dt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    if (this.endHour === 24) {
      return dt
        .with({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .add({ days: 1 });
    }
    return dt.with({
      hour: this.endHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  computeWorkingHours = () => {
    return BusinessTime.computeWorkingHours(this.startHour, this.endHour);
  };

  isBusinessDay(datetime: Temporal.ZonedDateTime) {
    const date = datetime.toInstant().toZonedDateTimeISO(this.businessTimezone);

    const dayMonth =
      `${date.day.toString().padStart(2, '0')}/${date.month.toString().padStart(2, '0')}` as Holiday;
    if (this.holidays.includes(dayMonth)) return false;

    const weekday = WEEKDAYS[date.dayOfWeek - 1];
    if (this.businessDays.includes(weekday)) return true;

    return false;
  }

  computeBusinessDaysInInterval({
    start,
    end,
  }: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  }) {
    const businessHours = this.computeBusinessHoursInInterval({ start, end });
    return businessHours / this.computeWorkingHours();
  }

  computeBusinessHoursInInterval({
    start,
    end,
  }: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  }) {
    return this.computeBusinessTimeInInterval({ start, end, unit: 'hours' });
  }

  computeBusinessMinutesInInterval({
    start,
    end,
  }: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  }) {
    return this.computeBusinessTimeInInterval({ start, end, unit: 'minutes' });
  }

  computeBusinessSecondsInInterval({
    start,
    end,
  }: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  }) {
    return this.computeBusinessTimeInInterval({ start, end, unit: 'seconds' });
  }

  computeBusinessTimeInInterval({
    start,
    end,
    unit,
  }: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
    unit: 'hours' | 'minutes' | 'seconds';
  }) {
    if (Temporal.ZonedDateTime.compare(start, end) > 0) {
      throw new Error('start date is greater than end date');
    }

    const interval = {
      start: this._moveDateInBusinessTime({ datetime: start }),
      end: this._moveDateInBusinessTime({ datetime: end }),
    };

    let datetime = interval.start;
    let businessTime = 0;

    while (Temporal.ZonedDateTime.compare(datetime, interval.end) < 0) {
      if (!this.isBusinessDay(datetime)) {
        datetime = this.setToStartOfDay(datetime.add({ days: 1 }));
        continue;
      }

      if (datetime.toPlainDate().equals(interval.end.toPlainDate())) {
        businessTime += interval.end.since(datetime).total(unit);
        datetime = interval.end;
      } else {
        const endOfBusinessDay = this.setToEndOfDay(datetime);
        businessTime += endOfBusinessDay.since(datetime).total(unit);
        datetime = this.setToStartOfDay(datetime.add({ days: 1 }));
      }
    }

    return businessTime;
  }

  /**
   * Move the date in a business time (moveBehind = false)
   * e.g. 06:00 => 10:00 of the current day
   * e.g. 22:00 => 10:00 of the next day
   *
   * Move the date in a business time (moveBehind = true)
   * e.g. 06:00 => 19:00 of the previous day
   * e.g. 22:00 => 19:00 of the current day
   *
   * Warning ⚠️ _moveDateInBusinessTime doesn't retain the original timezone of the datetime in input, but it returns a datetime with the same timezone used to compute business times.
   * It follows that behaviour because this method should be private and used only as helper. It is public only for testing purpose.
   */
  _moveDateInBusinessTime({
    datetime,
    moveBehind = false,
  }: {
    datetime: Temporal.ZonedDateTime;
    moveBehind?: boolean;
  }) {
    let date = datetime.toInstant().toZonedDateTimeISO(this.businessTimezone);
    const start = this.setToStartOfDay(date);
    const end = this.setToEndOfDay(date);

    if (Temporal.ZonedDateTime.compare(date, start) < 0) {
      date = moveBehind
        ? this.setToEndOfDay(date.subtract({ days: 1 }))
        : start;
    }
    if (Temporal.ZonedDateTime.compare(date, end) > 0) {
      date = moveBehind
        ? this.setToEndOfDay(date)
        : this.setToStartOfDay(date.add({ days: 1 }));
    }
    while (!this.isBusinessDay(date)) {
      date = moveBehind
        ? this.setToEndOfDay(date.subtract({ days: 1 }))
        : this.setToStartOfDay(date.add({ days: 1 }));
    }
    return date;
  }

  addBusinessHoursToDate({
    datetime,
    hours,
  }: {
    datetime: Temporal.ZonedDateTime;
    hours: number;
  }) {
    return this.addBusinessSecondsToDate({ datetime, seconds: 3600 * hours });
  }

  addBusinessSecondsToDate({
    datetime,
    seconds,
  }: {
    datetime: Temporal.ZonedDateTime;
    seconds: number;
  }) {
    if (seconds === 0) {
      return datetime;
    }

    let date = this._moveDateInBusinessTime({ datetime });
    let remainingSeconds = seconds;
    while (remainingSeconds > 0) {
      if (!this.isBusinessDay(date)) {
        date = date.add({ days: 1 });
        continue;
      }

      const endOfBusinessDay = this.setToEndOfDay(date);
      const secondsUntilEndOfBusinessDay = Math.round(
        endOfBusinessDay.since(date).total('seconds'),
      );

      if (remainingSeconds <= secondsUntilEndOfBusinessDay) {
        date = date.add({ seconds: remainingSeconds });
        remainingSeconds = 0;
      } else {
        date = this.setToStartOfDay(date.add({ days: 1 }));
        remainingSeconds -= secondsUntilEndOfBusinessDay;
      }
    }

    return date
      .with({ second: 0, millisecond: 0 })
      .toInstant()
      .toZonedDateTimeISO(datetime.timeZoneId);
  }

  removeBusinessHoursFromDate({
    datetime,
    hours,
  }: {
    datetime: Temporal.ZonedDateTime;
    hours: number;
  }) {
    return this.removeBusinessSecondsFromDate({
      datetime,
      seconds: 3600 * hours,
    });
  }

  removeBusinessSecondsFromDate({
    datetime,
    seconds,
  }: {
    datetime: Temporal.ZonedDateTime;
    seconds: number;
  }) {
    if (seconds === 0) {
      return datetime;
    }

    let date = this._moveDateInBusinessTime({ datetime, moveBehind: true });
    let remainingSeconds = seconds;
    while (remainingSeconds > 0) {
      if (!this.isBusinessDay(date)) {
        date = date.subtract({ days: 1 });
        continue;
      }

      const startOfBusinessDay =
        date.hour === 0 && date.minute === 0
          ? this.setToStartOfDay(date.subtract({ days: 1 }))
          : this.setToStartOfDay(date);
      const secondsFromStartOfBusinessDay = Math.round(
        date.since(startOfBusinessDay).total('seconds'),
      );

      if (remainingSeconds <= secondsFromStartOfBusinessDay) {
        date = date.subtract({ seconds: remainingSeconds });
        remainingSeconds = 0;
      } else {
        date = date.subtract({ days: 1 });
        // For endHour=24, setToEndOfDay on a midnight date would move forward again.
        // When already at midnight, stay there — it IS the end of the 24h day.
        if (!(date.hour === 0 && date.minute === 0 && this.endHour === 24)) {
          date = this.setToEndOfDay(date);
        }
        remainingSeconds -= secondsFromStartOfBusinessDay;
      }
    }

    return date
      .with({ second: 0, millisecond: 0 })
      .toInstant()
      .toZonedDateTimeISO(datetime.timeZoneId);
  }

  hoursToDays(hours: number) {
    return hours / this.computeWorkingHours();
  }
}
