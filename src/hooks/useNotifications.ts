import { useEffect } from 'react'
import { useSettings } from './useSettings'
import {
  requestNotificationPermission,
  scheduleDaily,
  sendNotification,
  stopNotifications,
} from '../utils/notifications'
import { db } from '../db/database'
import { format } from 'date-fns'

export function useNotifications() {
  const { notificationsEnabled, getSetting } = useSettings()
  const time = getSetting('notificationTime', '20:00')

  useEffect(() => {
    if (!notificationsEnabled) {
      stopNotifications()
      return
    }

    requestNotificationPermission().then((granted) => {
      if (!granted) return

      scheduleDaily(time, async () => {
        const today = format(new Date(), 'yyyy-MM-dd')
        const todayTxs = await db.transactions
          .where('date')
          .equals(today)
          .count()

        if (todayTxs === 0) {
          sendNotification(
            'Przypomnienie LibreBudget',
            'Nie zapomnij zapisać dzisiejszych wydatków!',
          )
        }
      })
    })

    return () => stopNotifications()
  }, [notificationsEnabled, time])
}
