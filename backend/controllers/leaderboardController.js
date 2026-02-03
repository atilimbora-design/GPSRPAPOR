const db = require('../config/database');

// Helper: Get Period Dates
function getPeriodDates(periodType, referenceDate) {
    const now = referenceDate ? new Date(referenceDate) : new Date();
    let startDate, endDate;

    // Formatting helper YYYY-MM-DD
    const fmt = (d) => d.toISOString().split('T')[0];

    switch (periodType) {
        case 'daily':
            startDate = endDate = fmt(now);
            break;

        case 'weekly':
            // Monday based week
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            startDate = fmt(monday);

            const nextSunday = new Date(monday);
            nextSunday.setDate(monday.getDate() + 6);
            endDate = fmt(nextSunday);
            break;

        case 'monthly':
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            // Note: new Date(year, month, 0) gives last day of PREVIOUS month. 
            // We want last day of CURRENT month: (year, month+1, 0)
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            // Fix JS timezone offset issue by explicitly setting UTC or using string manip
            // But fmt() uses toISOString which is UTC.
            // Let's use simple local date construction to avoid UTC shift if local time is late.
            // Actually, for simplicity and robustness in this scope:
            startDate = fmt(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
            endDate = fmt(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)));
            break;

        case 'yearly':
            startDate = `${now.getFullYear()}-01-01`;
            endDate = `${now.getFullYear()}-12-31`;
            break;

        default: // default to weekly if unknown
            return getPeriodDates('weekly', referenceDate);
    }

    return { startDate, endDate };
}

exports.getLeaderboard = (req, res) => {
    const { period = 'weekly', date } = req.query;
    const { startDate, endDate } = getPeriodDates(period, date);

    // Logic:
    // 1. Calculate totals from reports table dynamically (real-time calculation)
    // 2. Or use cache table? Prompt mentions cache table and Cron Job.
    // Since Cron Job will update cache Hourly, for "Instant" feedback we might want live data? 
    // The prompt says "Lider tablosu cache'le (her saat başı güncelle)".
    // AND "GET /api/leaderboard" endpoint should likely return from CACHE for speed, 
    // OR return live if we want.
    // Let's follow the prompt's implied architecture: Use `leaderboard_cache` table.
    // HOWEVER, if cache is empty (e.g. first run), we should probably calculate on fly or return empty.
    // Let's TRY to read from cache first. 

    db.all(`
        SELECT 
            lc.rank,
            lc.previous_rank,
            lc.total_collection,
            lc.report_count,
            lc.rank - lc.previous_rank as rank_change_calc, -- This logic might be inverted: prev(2) -> curr(1) = +1 improvement?
            -- Prompt: "rank_change pozitif ise yükselmiş". e.g. Rank 2 -> Rank 1. 
            -- Meaning: previous_rank - rank = change. (2 - 1 = +1).
            (lc.previous_rank - lc.rank) as rank_change,
            u.id as user_id,
            u.full_name,
            u.profile_photo
        FROM leaderboard_cache lc
        JOIN users u ON u.id = lc.user_id
        WHERE lc.period_type = ? 
        AND lc.period_start = ? 
        AND lc.period_end = ?
        ORDER BY lc.rank ASC
    `, [period, startDate, endDate], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // If no cache, maybe Calc Live? Or just return empty?
        // Let's return empty/live fallback if critical, but for now strict compliance to cache design.
        // If rows empty, we could trigger a calc background job?
        // Let's just return what we have.

        const leaderboard = rows.map(r => ({
            ...r,
            is_top_3: r.rank <= 3
        }));

        let myRankData = null;
        if (req.user) {
            myRankData = leaderboard.find(r => r.user_id === req.user.id);
        }

        res.json({
            success: true,
            period,
            period_start: startDate,
            period_end: endDate,
            leaderboard,
            my_rank: myRankData
        });
    });
};

exports.getWeeklySummary = (req, res) => {
    // Live calc for Dashboard Card
    const { startDate, endDate } = getPeriodDates('weekly');

    // Get My Stats for this week
    db.get(`
        SELECT 
            SUM(total_collection) as total,
            COUNT(*) as count
        FROM reports
        WHERE user_id = ?
        AND report_date BETWEEN ? AND ?
        AND status = 'submitted'
    `, [req.user.id, startDate, endDate], (err, current) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Previous Week
        const prevDate = new Date();
        prevDate.setDate(prevDate.getDate() - 7);
        const prevPeriod = getPeriodDates('weekly', prevDate.toISOString());

        db.get(`
            SELECT SUM(total_collection) as total FROM reports
            WHERE user_id = ? AND report_date BETWEEN ? AND ? AND status = 'submitted'
        `, [req.user.id, prevPeriod.startDate, prevPeriod.endDate], (err, prev) => {

            const currentTotal = current?.total || 0;
            const prevTotal = prev?.total || 0;
            const diff = currentTotal - prevTotal;

            // Percent change
            let percent = 0;
            if (prevTotal > 0) {
                percent = (diff / prevTotal) * 100;
            } else if (currentTotal > 0) {
                percent = 100;
            }

            res.json({
                success: true,
                period_start: startDate,
                period_end: endDate,
                total_collection: currentTotal,
                report_count: current?.count || 0,
                previous_week_collection: prevTotal,
                change_amount: diff,
                change_percent: parseFloat(percent.toFixed(2)),
                change_direction: diff > 0 ? 'up' : (diff < 0 ? 'down' : 'same')
            });
        });
    });
};

// Internal function to update cache (Called by Cron)
exports.updateCacheInternal = async (periodType) => {
    const { startDate, endDate } = getPeriodDates(periodType);

    // 1. Calculate Rankings based on Reports
    const rankings = await new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                user_id,
                SUM(total_collection) as total,
                COUNT(*) as report_count
            FROM reports
            WHERE report_date BETWEEN ? AND ?
            AND status = 'submitted'
            GROUP BY user_id
            ORDER BY total DESC
        `, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows));
    });

    // 2. Insert/Update Cache
    // We need to fetch PREVIOUS rank to calculate change?
    // The previous rank implies the rank in the PREVIOUS period? Or previous calculation of CURRENT period?
    // "previous_rank ... Önceki sıralama (artış/azalış göstergesi için)"
    // Usually means "Yesterday's rank for this month" OR "Last Week's rank".
    // Let's assume it means "Last Calculation's Rank" for the SAME period window.
    // So we need to fetch what is currently in cache before overwriting.

    const currentCache = await new Promise((resolve) => {
        db.all(`SELECT user_id, rank FROM leaderboard_cache WHERE period_type = ? AND period_start = ?`,
            [periodType, startDate], (err, rows) => resolve(rows || []));
    });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Clear current period cache to rebuild
        // Actually replace is better.

        for (let i = 0; i < rankings.length; i++) {
            const row = rankings[i];
            const newRank = i + 1;

            // Find old rank
            const oldData = currentCache.find(c => c.user_id === row.user_id);
            const prevRank = oldData ? oldData.rank : 0; // 0 means new entry

            // Note: IF we want "Last Week's Rank", logic is different. 
            // Assuming "Movement within this board".

            db.run(`
                INSERT OR REPLACE INTO leaderboard_cache
                (user_id, period_type, period_start, period_end, total_collection, rank, previous_rank, report_count, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [row.user_id, periodType, startDate, endDate, row.total, newRank, prevRank || newRank, row.report_count]); // If new, prev=curr (no change)
        }

        db.run('COMMIT');
    });

    return rankings.length;
};
