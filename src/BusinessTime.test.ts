import { describe, expect, test } from 'vitest';
import {
  BusinessTime,
  type DAY_OF_WEEK,
  DayOfWeek,
  type Holiday,
} from './BusinessTime.js';

type TestCase = {
  businessTimezone: string;
  businessDays: DAY_OF_WEEK[];
  businessHours: number[];
  holidays: Holiday[];
  start?: string;
  end?: string;
  expected: any;
};

type BusinessTimeMethod = keyof InstanceType<typeof BusinessTime>;

const testEachComputeTime = (
  testCases: TestCase[],
  businessTimeFunctionName: BusinessTimeMethod,
) => {
  for (const {
    start,
    end,
    businessTimezone,
    businessHours,
    businessDays,
    holidays,
    expected,
  } of testCases) {
    if (!start || !end) {
      throw new Error('Start and end dates must be defined');
    }

    const startDatetime = Temporal.ZonedDateTime.from(start);
    const endDatetime = Temporal.ZonedDateTime.from(end);
    const businessTime = new BusinessTime({
      businessTimezone,
      businessHours,
      businessDays,
      holidays,
    });

    expect(
      // @ts-expect-error
      businessTime[businessTimeFunctionName]({
        start: startDatetime,
        end: endDatetime,
      }),
    ).toEqual(expected);
  }
};

const testEachMoveDateInBusinessTime = (
  testCases: (TestCase & { datetime: string; moveBehind: boolean })[],
) => {
  for (const {
    businessTimezone,
    businessHours,
    businessDays,
    holidays,
    datetime,
    moveBehind,
    expected,
  } of testCases) {
    const businessTime = new BusinessTime({
      businessTimezone,
      businessHours,
      businessDays,
      holidays,
    });

    const actualDt = businessTime._moveDateInBusinessTime({
      datetime: Temporal.ZonedDateTime.from(datetime),
      moveBehind,
    });

    expect(
      actualDt.toString({ offset: 'never', fractionalSecondDigits: 3 }),
    ).toEqual(expected);
  }
};

const testEachIsBusinessDay = (
  testCases: (TestCase & { datetime: string })[],
) => {
  for (const {
    datetime,
    businessTimezone,
    businessHours,
    businessDays,
    holidays,
    expected,
  } of testCases) {
    const businessTime = new BusinessTime({
      businessTimezone,
      businessHours,
      businessDays,
      holidays,
    });

    expect(
      businessTime.isBusinessDay(Temporal.ZonedDateTime.from(datetime)),
    ).toEqual(expected);
  }
};

const testEachAddBusinessSecondsToDate = (
  testCases: (TestCase & { datetime: string; seconds: number })[],
) => {
  for (const {
    seconds,
    businessTimezone,
    businessHours,
    businessDays,
    holidays,
    datetime,
    expected,
  } of testCases) {
    const businessTime = new BusinessTime({
      businessTimezone,
      businessHours,
      businessDays,
      holidays,
    });

    expect(
      businessTime
        .addBusinessSecondsToDate({
          datetime: Temporal.ZonedDateTime.from(datetime),
          seconds,
        })
        .toString({ offset: 'never', fractionalSecondDigits: 3 }),
    ).toEqual(expected);
  }
};

const testEachRemoveBusinessSecondsToDate = (
  testCases: (TestCase & { datetime: string; seconds: number })[],
) => {
  for (const {
    seconds,
    businessTimezone,
    businessHours,
    businessDays,
    holidays,
    datetime,
    expected,
  } of testCases) {
    const businessTime = new BusinessTime({
      businessTimezone,
      businessHours,
      businessDays,
      holidays,
    });

    expect(
      businessTime
        .removeBusinessSecondsFromDate({
          datetime: Temporal.ZonedDateTime.from(datetime),
          seconds,
        })
        .toString({ offset: 'never', fractionalSecondDigits: 3 }),
    ).toEqual(expected);
  }
};

describe('BusinessTime', () => {
  test('compute business days', () => {
    testEachComputeTime(
      [
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: `2020-12-28T09:00:00.000[Europe/Rome]`,
          end: '2020-12-29T23:00:00.000[Europe/Rome]',
          expected: 2,
        },
      ],
      'computeBusinessDaysInInterval',
    );
  });

  test('compute business hours', () => {
    testEachComputeTime(
      [
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T13:45:00.000[Europe/Rome]',
          end: '2020-12-28T14:00:00.000[Europe/Rome]',
          expected: 0.25,
        }, // same hour
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: ['25/12', '26/12'],
          start: '2020-12-25T10:45:00.000[Europe/Rome]',
          end: '2020-12-27T10:00:00.000[Europe/Rome]',
          expected: 0,
        }, // holidays
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T14:00:00.000[Europe/Rome]',
          end: '2020-12-28T18:30:00.000[Europe/Rome]',
          expected: 4.5,
        }, // same day
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-18T14:00:00.000[Europe/Rome]',
          end: '2020-12-21T14:30:00.000[Europe/Rome]',
          expected: 9.5,
        }, // cross weekend
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T15:00:00.000[Europe/Rome]',
          end: '2020-12-28T20:00:00.000[Europe/Rome]',
          expected: 4,
        }, // 4 hours in Rome
        {
          businessTimezone: 'America/Los_Angeles',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T15:00:00.000[Europe/Rome]',
          end: '2020-12-28T20:00:00.000[Europe/Rome]',
          expected: 1,
        }, // 1 hour in San Francisco
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2021-01-04T10:00:00.000[Europe/Rome]',
          end: '2021-03-01T10:00:00.000[Europe/Rome]',
          expected: 360,
        }, // 8 weeks, 45 hours / week => 360
      ],
      'computeBusinessHoursInInterval',
    );
  });

  test('compute business minutes', () => {
    testEachComputeTime(
      [
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T13:45:00.000[Europe/Rome]',
          end: '2020-12-28T14:00:00.000[Europe/Rome]',
          expected: 15,
        },
        {
          businessTimezone: 'Europe/Rome',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: ['01/01'],
          start: '2020-12-31T13:45:00.000[Europe/Rome]',
          end: '2021-01-04T19:00:00.000[Europe/Rome]',
          expected: 855,
        },
      ],
      'computeBusinessMinutesInInterval',
    );
  });

  test('compute business seconds', () => {
    testEachComputeTime(
      [
        {
          businessTimezone: 'America/Los_Angeles',
          businessDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          businessHours: [10, 19],
          holidays: [],
          start: '2020-12-28T15:00:00.000[Europe/Rome]',
          end: '2020-12-28T20:00:00.000[Europe/Rome]',
          expected: 3600,
        }, // 1 hour in San Francisco
      ],
      'computeBusinessSecondsInInterval',
    );
  });

  test('compute isBusinessDay', () => {
    testEachIsBusinessDay([
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [10, 19],
        holidays: ['25/12', '26/12'],
        datetime: '2020-12-28T14:00:00.000[Europe/Rome]',
        expected: true,
      }, // monday
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY, DayOfWeek.FRIDAY],
        businessHours: [10, 19],
        holidays: ['26/12'],
        datetime: '2020-12-25T14:00:00.000[Europe/Rome]',
        expected: true,
      }, // Christmas 2020 (friday) configured as business day
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        holidays: ['25/12', '26/12'],
        businessHours: [10, 19],
        datetime: '2020-12-27T14:00:00.000[Europe/Rome]',
        expected: false,
      }, // tuesday configured as rest day
      {
        businessTimezone: 'America/Los_Angeles',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [10, 19],
        holidays: ['25/12', '26/12'],
        datetime: '2020-12-28T01:00:00.000[Europe/Rome]',
        expected: false,
      }, // monday in Rome, sunday in San Francisco
    ]);
  });

  test('compute moveDateInBusinessTime', () => {
    testEachMoveDateInBusinessTime([
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [13, 15],
        holidays: [],
        moveBehind: false,
        datetime: '2020-12-28T11:00:00.000[Europe/Rome]',
        expected: '2020-12-28T13:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [13, 15],
        holidays: [],
        moveBehind: false,
        datetime: '2020-12-28T14:00:00.000[Europe/Rome]',
        expected: '2020-12-28T14:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [13, 15],
        holidays: ['01/01'],
        moveBehind: false,
        datetime: '2020-12-28T16:00:00.000[Europe/Rome]',
        expected: '2021-01-04T13:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'America/Los_Angeles',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        moveBehind: false,
        datetime: '2021-06-15T00:00:00.000[Europe/Rome]', // tuesday
        expected: '2021-06-14T15:00:00.000[America/Los_Angeles]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
        businessHours: [13, 15],
        holidays: [],
        moveBehind: true,
        datetime: '2022-04-12T11:00:00.000[Europe/Rome]',
        expected: '2022-04-11T15:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [13, 15],
        holidays: [],
        moveBehind: true,
        datetime: '2020-12-28T14:00:00.000[Europe/Rome]',
        expected: '2020-12-28T14:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [DayOfWeek.MONDAY],
        businessHours: [13, 15],
        holidays: ['01/01'],
        moveBehind: true,
        datetime: '2022-04-11T11:00:00.000[Europe/Rome]',
        expected: '2022-04-04T15:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'America/Los_Angeles',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        moveBehind: true,
        datetime: '2021-06-15T00:00:00.000[Europe/Rome]', // tuesday
        expected: '2021-06-14T15:00:00.000[America/Los_Angeles]',
      },
    ]);
  });

  test('add business seconds to date', () => {
    testEachAddBusinessSecondsToDate([
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        datetime: '2020-12-28T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 10,
        expected: '2020-12-29T11:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        datetime: '2022-04-04T19:45:00.000[Europe/Rome]',
        seconds: 3600 * 10,
        expected: '2022-04-06T11:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 24],
        holidays: ['01/01'],
        datetime: '2020-12-28T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 96,
        expected: '2021-01-02T10:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 24],
        holidays: [],
        datetime: '2020-12-28T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 96,
        expected: '2021-01-01T10:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 12],
        holidays: [],
        datetime: '2020-12-28T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2020-12-30T10:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 12],
        holidays: [],
        datetime: '2022-04-11T18:00:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-13T12:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [12, 24],
        holidays: [],
        datetime: '2022-04-04T10:00:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-06T00:00:00.000[Europe/Rome]',
      },
    ]);
  });

  test('remove business seconds from date', () => {
    testEachRemoveBusinessSecondsToDate([
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        datetime: '2020-12-28T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 10,
        expected: '2020-12-24T18:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        businessHours: [10, 19],
        holidays: [],
        datetime: '2022-04-08T19:45:00.000[Europe/Rome]',
        seconds: 3600 * 10,
        expected: '2022-04-07T18:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 24],
        holidays: ['25/12'],
        datetime: '2020-12-28T10:11:11.111[Europe/Rome]',
        seconds: 3600 * 96, // 4 days
        expected: '2020-12-23T10:11:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ], // handle weekend
        businessHours: [0, 24],
        holidays: [],
        datetime: '2022-04-11T12:00:00.000[Europe/Rome]',
        seconds: 3600 * 48, // 2 days
        expected: '2022-04-07T12:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ], // handle weekend
        businessHours: [1, 24],
        holidays: [],
        datetime: '2022-04-11T12:00:00.000[Europe/Rome]',
        seconds: 3600 * 48, // 2 days
        expected: '2022-04-07T10:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 12],
        holidays: [],
        datetime: '2022-04-08T10:45:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-06T10:45:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [0, 12],
        holidays: [],
        datetime: '2022-04-08T18:00:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-07T00:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ],
        businessHours: [12, 24],
        holidays: [],
        datetime: '2022-04-08T10:00:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-06T12:00:00.000[Europe/Rome]',
      },
      {
        businessTimezone: 'Europe/Rome',
        businessDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ], // handle weekend
        businessHours: [12, 24],
        holidays: [],
        datetime: '2022-04-11T10:00:00.000[Europe/Rome]',
        seconds: 3600 * 24,
        expected: '2022-04-07T12:00:00.000[Europe/Rome]',
      },
    ]);
  });

  test('compute working hours', () => {
    expect(BusinessTime.computeWorkingHours(10, 19)).toBe(9);
    expect(BusinessTime.computeWorkingHours(0, 24)).toBe(24);
    expect(BusinessTime.computeWorkingHours(18, 3)).toBe(9);
    expect(BusinessTime.computeWorkingHours(22, 0)).toBe(2);
  });

  test('add business hours to date', () => {
    const businessTime = new BusinessTime({
      businessTimezone: 'Europe/Rome',
      businessDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ],
      businessHours: [10, 19],
      holidays: [],
    });
    expect(
      businessTime
        .addBusinessHoursToDate({
          datetime: Temporal.ZonedDateTime.from(
            '2020-12-28T10:45:00.000[Europe/Rome]',
          ),
          hours: 10,
        })
        .toString({ offset: 'never', fractionalSecondDigits: 3 }),
    ).toEqual('2020-12-29T11:45:00.000[Europe/Rome]');
  });

  test('remove business hours from date', () => {
    const businessTime = new BusinessTime({
      businessTimezone: 'Europe/Rome',
      businessDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ],
      businessHours: [10, 19],
      holidays: [],
    });
    expect(
      businessTime
        .removeBusinessHoursFromDate({
          datetime: Temporal.ZonedDateTime.from(
            '2020-12-28T10:45:00.000[Europe/Rome]',
          ),
          hours: 10,
        })
        .toString({ offset: 'never', fractionalSecondDigits: 3 }),
    ).toEqual('2020-12-24T18:45:00.000[Europe/Rome]');
  });

  test('hours to days', () => {
    const businessTime = new BusinessTime({
      businessTimezone: 'Europe/Rome',
      businessDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ],
      businessHours: [10, 19],
      holidays: [],
    });
    expect(businessTime.hoursToDays(9)).toBe(1);
    expect(businessTime.hoursToDays(4.5)).toBe(0.5);
  });

  test('add/remove business seconds with zero returns same datetime', () => {
    const businessTime = new BusinessTime({
      businessTimezone: 'Europe/Rome',
      businessDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ],
      businessHours: [10, 19],
      holidays: [],
    });
    const datetime = Temporal.ZonedDateTime.from(
      '2020-12-28T14:00:00.000[Europe/Rome]',
    );
    expect(
      businessTime.addBusinessSecondsToDate({ datetime, seconds: 0 }),
    ).toBe(datetime);
    expect(
      businessTime.removeBusinessSecondsFromDate({ datetime, seconds: 0 }),
    ).toBe(datetime);
  });
});
