import Seo from '../components/seo/seo';

const History = () => {
  return (
    <>
      <Seo
        title="History"
        description="Check out the history of your activities on the livestreaming application."
        keywords="history, activities, stream application,stream,watch,video,content,purushotam,youtube,hls,video streaming"
        name="Stream by Purushotam"
        type="article"
        address="/history"
      />
      <div className='w-full h-full flex flex-col p-4 items-center gap-3'>
        <h2 className='text-2xl font-bold tracking-wide '>History</h2>
        <p className='text-lg tracking-wide'>Hey we are currently working on history feature. Sorry to break your curosity.Hope to see you back soon.</p>
      </div>
    </>
  )
}

export default History
