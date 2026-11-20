
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

function ExamLeaderboard() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await API.get(
          `/exams/${examId}/leaderboard`
        );

        setExam(response.data.exam);
        setStudents(response.data.leaderboard || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
          'Unable to load leaderboard'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [examId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center">
          Loading leaderboard...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <button
          onClick={() => navigate('/institute/exams')}
          className="mb-5 rounded-lg border px-4 py-2 hover:bg-gray-100"
        >
          ← Back to Exams
        </button>

        <div className="mb-6 rounded-xl bg-white p-5 shadow">
          <h1 className="text-2xl font-bold text-gray-800">
            {exam?.title || 'Test Leaderboard'}
          </h1>

          <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
            <p>
              <strong>Subject:</strong> {exam?.subject || 'N/A'}
            </p>
            <p>
              <strong>Batch/Class:</strong> {exam?.class || 'N/A'}
            </p>
            <p>
              <strong>Total Marks:</strong> {exam?.totalMarks ?? 'N/A'}
            </p>
            <p>
              <strong>Test Date:</strong>{' '}
              {exam?.startTime
                ? new Date(exam.startTime).toLocaleDateString('en-IN')
                : 'N/A'}
            </p>
            <p>
              <strong>Students:</strong> {students.length}
            </p>
            <p>
              <strong>Result Declared:</strong>{' '}
              {formatDate(exam?.resultDeclaredAt)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">
              Student Rankings
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No leaderboard records found for this test.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4">Percentage</th>
                    <th className="p-4">Time Taken</th>
                    <th className="p-4">Submitted At</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {students.map((student, index) => (
                    <tr
                      key={student.studentId || student._id || index}
                      className="hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold">
                        {student.rank ?? '—'}
                        {student.rank === 1 ? ' 🥇' : ''}
                      </td>

                      <td className="p-4">
                        {student.name || 'N/A'}
                      </td>

                      <td className="p-4">
                        {student.email || 'N/A'}
                      </td>

                      <td className="p-4">
                        {student.score ?? 0} / {student.totalMarks ?? exam?.totalMarks ?? 0}
                      </td>

                      <td className="p-4">
                        {student.percentage ?? 0}%
                      </td>

                      <td className="p-4">
                        {student.timeTaken != null
                          ? `${Math.floor(student.timeTaken / 60)}m ${student.timeTaken % 60}s`
                          : 'N/A'}
                      </td>

                      <td className="p-4">
                        {formatDate(student.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ExamLeaderboard;
