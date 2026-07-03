(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var success = style.getPropertyValue('--success').trim();

  // --- 各阶段耗时柱状图 ---
  var chart1 = echarts.init(document.getElementById('chart-timing'), null, { renderer: 'svg' });
  chart1.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      formatter: function(params) {
        return params[0].name + ': ' + params[0].value + ' 秒';
      }
    },
    grid: { left: '8%', right: '8%', top: '18%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: ['推荐穿搭', '图片上传', '试衣生成', '完整流程总计'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 13, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: '耗时 (秒)',
      nameTextStyle: { color: muted, fontSize: 12 },
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 12 },
      splitLine: { lineStyle: { color: rule, type: 'dashed', opacity: 0.6 } }
    },
    series: [{
      type: 'bar',
      data: [
        { value: 17.83, itemStyle: { color: accent } },
        { value: 1.30, itemStyle: { color: accent2 } },
        { value: 7.23, itemStyle: { color: accent } },
        { value: 25.06, itemStyle: { color: success } }
      ],
      barWidth: '45%',
      label: {
        show: true,
        position: 'top',
        formatter: '{c}s',
        color: ink,
        fontSize: 14,
        fontWeight: 600
      }
    }]
  });
  window.addEventListener('resize', function() { chart1.resize(); });

  // --- 推荐方案评分对比 ---
  var chart2 = echarts.init(document.getElementById('chart-scores'), null, { renderer: 'svg' });
  chart2.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter: function(params) {
        return params.name + '<br/>评分: ' + params.value;
      }
    },
    grid: { left: '8%', right: '8%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: ['方案1 白衬衫+黑牛仔裤', '方案2 灰卫衣+藏青裤', '方案3 白衬衫+藏青裤'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 11, interval: 0, rotate: 0 }
    },
    yAxis: {
      type: 'value',
      min: 0.8,
      max: 1.0,
      nameTextStyle: { color: muted, fontSize: 12 },
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 12 },
      splitLine: { lineStyle: { color: rule, type: 'dashed', opacity: 0.6 } }
    },
    series: [{
      type: 'bar',
      data: [
        { value: 0.95, itemStyle: { color: accent } },
        { value: 0.93, itemStyle: { color: accent2 } },
        { value: 0.94, itemStyle: { color: accent } }
      ],
      barWidth: '45%',
      label: {
        show: true,
        position: 'top',
        formatter: '{c}',
        color: ink,
        fontSize: 14,
        fontWeight: 600
      }
    }]
  });
  window.addEventListener('resize', function() { chart2.resize(); });
})();
