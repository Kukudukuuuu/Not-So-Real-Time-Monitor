const express = require('express');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

let lastCpuInfo = null;
let lastNetStats = null;

app.use(express.static(__dirname));

function getProcesses() {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? 'powershell "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Id,ProcessName,WorkingSet64 | ConvertTo-Csv -NoTypeInformation"'
            : 'ps aux --no-headers | head -10';
            
        exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err || !stdout) {
                resolve([{ pid: 4, name: 'System', mem: 0 }]);
                return;
            }
            
            const lines = stdout.trim().split('\n');
            const processes = [];
            
            if (process.platform === 'win32') {
                lines.slice(1).forEach(line => {
                    const parts = line.replace(/"/g, '').split(',');
                    if (parts.length >= 3) {
                        processes.push({
                            pid: parseInt(parts[0]) || 0,
                            name: parts[1] || 'Unknown',
                            mem: Math.round((parseInt(parts[2]) || 0) / 1024 / 1024)
                        });
                    }
                });
            } else {
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 11) {
                        const memMB = Math.round(parseFloat(parts[5]) || 0);
                        processes.push({
                            pid: parseInt(parts[1]) || 0,
                            name: parts[10] || parts[0] || 'Unknown',
                            mem: memMB
                        });
                    }
                });
            }
            
            resolve(processes.slice(0, 10));
        });
    });
}

function getNetworkStats() {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            exec('powershell "Get-NetAdapterStatistics | Select-Object ReceivedBytes,SentBytes | ConvertTo-Csv -NoTypeInformation"', { maxBuffer: 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    resolve({ sent: 0, received: 0 });
                    return;
                }
                
                const lines = stdout.trim().split('\n');
                let sent = 0, received = 0;
                
                lines.slice(1).forEach(line => {
                    const parts = line.replace(/"/g, '').split(',');
                    if (parts.length >= 2) {
                        received += parseInt(parts[0]) || 0;
                        sent += parseInt(parts[1]) || 0;
                    }
                });
                
                resolve({ sent, received });
            });
        } else {
            exec('cat /proc/net/dev', { maxBuffer: 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    resolve({ sent: 0, received: 0 });
                    return;
                }
                
                const lines = stdout.trim().split('\n');
                let sent = 0, received = 0;
                
                lines.slice(2).forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 10) {
                        received += parseInt(parts[1]) || 0;
                        sent += parseInt(parts[9]) || 0;
                    }
                });
                
                resolve({ sent, received });
            });
        }
    });
}

app.get('/api/metrics', async (req, res) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    let cpuUsage = 0;
    
    if (lastCpuInfo) {
        let totalUsage = 0;
        let count = 0;
        
        for (let i = 0; i < cpus.length; i++) {
            const cpu = cpus[i].times;
            const last = lastCpuInfo[i];
            
            const idle = cpu.idle - last.idle;
            const total = (cpu.user - last.user) + (cpu.nice - last.nice) + 
                         (cpu.sys - last.sys) + (cpu.idle - last.idle);
            
            if (total > 0) {
                totalUsage += ((total - idle) / total) * 100;
                count++;
            }
        }
        
        if (count > 0) {
            cpuUsage = totalUsage / count;
        }
    } else {
        cpuUsage = 5 + Math.random() * 20;
    }
    
    lastCpuInfo = cpus.map(c => ({...c.times}));
    
    const netStats = await getNetworkStats();
    let netSent = 0, netRecv = 0;
    
    if (lastNetStats) {
        netSent = Math.max(0, netStats.sent - lastNetStats.sent);
        netRecv = Math.max(0, netStats.received - lastNetStats.received);
    }
    lastNetStats = { sent: netStats.sent, received: netStats.received };

    const loadAvg = process.platform === 'win32' 
        ? [(cpuUsage / 100) * cpus.length, (cpuUsage / 100) * cpus.length * 0.8, (cpuUsage / 100) * cpus.length * 0.6] 
        : os.loadavg();
    
    const procs = await getProcesses();

    res.json({
        hostname: os.hostname(),
        os: os.type(),
        cpuModel: cpus[0].model,
        cpuCores: cpus.length,
        cpuUsage: Math.max(0, Math.min(100, Math.round(cpuUsage * 10) / 10)),
        loadAvg: loadAvg,
        totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        usedMemGB: (usedMem / 1024 / 1024 / 1024).toFixed(1),
        memPercent: Math.round((usedMem / totalMem) * 100),
        uptime: os.uptime(),
        network: { sent: netSent, received: netRecv },
        processes: procs
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});