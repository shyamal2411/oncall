import React, { FC } from 'react';

import { HorizontalGroup, useStyles2 } from '@grafana/ui';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { ScheduleFiltersType } from 'components/ScheduleFilters/ScheduleFilters.types';
import { Text } from 'components/Text/Text';
import { Rotation } from 'containers/Rotation/Rotation';
import { TimelineMarks } from 'containers/TimelineMarks/TimelineMarks';
import {
  flattenShiftEvents,
  getLayersFromStore,
  getOverridesFromStore,
  getShiftsFromStore,
} from 'models/schedule/schedule.helpers';
import { Schedule, ShiftSwap, Event } from 'models/schedule/schedule.types';
import { WithStoreProps } from 'state/types';
import { withMobXProviderContext } from 'state/withStore';

import { DEFAULT_TRANSITION_TIMEOUT } from './Rotations.config';
import { findColor } from './Rotations.helpers';
import { getRotationsStyles } from './Rotations.styles';

import animationStyles from './Rotations.module.css';

interface ScheduleFinalProps extends WithStoreProps {
  scheduleId: Schedule['id'];
  simplified?: boolean;
  onShowOverrideForm: (shiftId: 'new', shiftStart: dayjs.Dayjs, shiftEnd: dayjs.Dayjs) => void;
  onShowShiftSwapForm: (id: ShiftSwap['id'] | 'new', params?: Partial<ShiftSwap>) => void;
  disabled?: boolean;
  filters: ScheduleFiltersType;
  onSlotClick?: (event: Event) => void;
}

const _ScheduleFinal: FC<ScheduleFinalProps> = observer(
  ({ store, simplified, scheduleId, filters, onShowShiftSwapForm, onShowOverrideForm, onSlotClick }) => {
    const {
      timezoneStore: { currentDateInSelectedTimezone, calendarStartDate },
    } = store;
    const base = 7 * 24 * 60; // in minutes
    const diff = currentDateInSelectedTimezone.diff(calendarStartDate, 'minutes');

    const styles = useStyles2(getRotationsStyles);

    const currentTimeX = diff / base;

    const shifts = flattenShiftEvents(getShiftsFromStore(store, scheduleId, calendarStartDate));

    const layers = getLayersFromStore(store, scheduleId, calendarStartDate);

    const overrides = getOverridesFromStore(store, scheduleId, calendarStartDate);

    const currentTimeHidden = currentTimeX < 0 || currentTimeX > 1;

    const getColor = (event: Event) => findColor(event.shift?.pk, layers, overrides);

    const handleShowOverrideForm = (shiftStart: dayjs.Dayjs, shiftEnd: dayjs.Dayjs) => {
      onShowOverrideForm('new', shiftStart, shiftEnd);
    };

    return (
      <div className={styles.root}>
        {!simplified && (
          <div className={styles.header}>
            <HorizontalGroup justify="space-between">
              <div className={styles.title}>
                <Text.Title level={4} type="primary">
                  Final schedule
                </Text.Title>
              </div>
            </HorizontalGroup>
          </div>
        )}
        <div className={styles.headerPlusContent}>
          {!currentTimeHidden && <div className={styles.currentTime} style={{ left: `${currentTimeX * 100}%` }} />}
          <TimelineMarks />
          <TransitionGroup className={styles.rotations}>
            {shifts && shifts.length ? (
              shifts.map(({ events }, index) => {
                return (
                  <CSSTransition key={index} timeout={DEFAULT_TRANSITION_TIMEOUT} classNames={{ ...animationStyles }}>
                    <Rotation
                      key={index}
                      events={events}
                      handleAddOverride={handleShowOverrideForm}
                      handleAddShiftSwap={onShowShiftSwapForm}
                      onShiftSwapClick={onShowShiftSwapForm}
                      simplified={simplified}
                      filters={filters}
                      getColor={getColor}
                      onSlotClick={onSlotClick}
                    />
                  </CSSTransition>
                );
              })
            ) : (
              <CSSTransition key={0} timeout={DEFAULT_TRANSITION_TIMEOUT} classNames={{ ...animationStyles }}>
                <Rotation events={[]} />
              </CSSTransition>
            )}
          </TransitionGroup>
        </div>
      </div>
    );
  }
);

export const ScheduleFinal = withMobXProviderContext(_ScheduleFinal);
