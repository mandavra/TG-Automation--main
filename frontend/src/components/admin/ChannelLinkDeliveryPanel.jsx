import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui';
import { RefreshCw, Send, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ChannelLinkDeliveryPanel = () => {
  const [statistics, setStatistics] = useState({});
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [autoVerifyHours, setAutoVerifyHours] = useState(24);
  
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/channel-links/admin/statistics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      toast({
        title: "Error fetching statistics",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch('/api/channel-links/admin/payments/requiring-verification', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      setPendingPayments(data.payments || []);
    } catch (error) {
      toast({
        title: "Error fetching pending payments",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkVerifyDeliver = async () => {
    if (selectedPayments.length === 0) {
      toast({
        title: "No payments selected",
        description: "Please select payments to process",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/channel-links/admin/bulk-verify-deliver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ paymentIds: selectedPayments })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Bulk operation completed",
          description: `Processed ${result.results.length} payments`
        });
        setSelectedPayments([]);
        fetchStatistics();
        fetchPendingPayments();
      }
    } catch (error) {
      toast({
        title: "Bulk operation failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleAutoVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/channel-links/admin/auto-verify-recent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ hoursBack: autoVerifyHours })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Auto-verification completed",
          description: `Verified ${result.verifiedCount} payments, delivered ${result.deliveredCount} links`
        });
        fetchStatistics();
        fetchPendingPayments();
      }
    } catch (error) {
      toast({
        title: "Auto-verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleIndividualDeliver = async (userId, paymentId) => {
    try {
      const response = await fetch(`/api/channel-links/admin/deliver/${userId}/${paymentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Links delivered successfully",
          description: `Delivered ${result.linksDelivered} links to user`
        });
        fetchStatistics();
        fetchPendingPayments();
      }
    } catch (error) {
      toast({
        title: "Delivery failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'verified': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'failed': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    
    const config = statusMap[status] || statusMap['pending'];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    fetchStatistics();
    fetchPendingPayments();
    setLoading(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Channel Link Delivery Management</h1>
        <Button onClick={() => { fetchStatistics(); fetchPendingPayments(); }} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold">{statistics.pendingVerification || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{statistics.successRate || '0%'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed Deliveries</p>
                <p className="text-2xl font-bold">{statistics.failedDeliveries || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Delivered</p>
                <p className="text-2xl font-bold">{statistics.totalDelivered || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Payments</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="auto">Auto Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Payments Requiring Verification</h3>
                {selectedPayments.length > 0 && (
                  <Button onClick={handleBulkVerifyDeliver} disabled={loading}>
                    Process Selected ({selectedPayments.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No payments requiring verification at this time.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPayments(pendingPayments.map(p => p.paymentId));
                            } else {
                              setSelectedPayments([]);
                            }
                          }}
                          checked={selectedPayments.length === pendingPayments.length && pendingPayments.length > 0}
                        />
                      </TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.paymentId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedPayments.includes(payment.paymentId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayments([...selectedPayments, payment.paymentId]);
                              } else {
                                setSelectedPayments(selectedPayments.filter(id => id !== payment.paymentId));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{payment.userId}</TableCell>
                        <TableCell>{payment.paymentId}</TableCell>
                        <TableCell>${payment.amount}</TableCell>
                        <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(payment.deliveryStatus)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleIndividualDeliver(payment.userId, payment.paymentId)}
                            disabled={loading}
                          >
                            Deliver Links
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Bulk Operations</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Bulk operations will process multiple payments simultaneously. Use with caution.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-4">
                <Button onClick={handleBulkVerifyDeliver} disabled={loading}>
                  Bulk Verify & Deliver All Pending
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Automated Recovery</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Auto-verify payments from last:</label>
                <Select value={autoVerifyHours.toString()} onValueChange={(value) => setAutoVerifyHours(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAutoVerify} disabled={loading}>
                  Run Auto-Verify
                </Button>
              </div>
              
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Auto-verification will check payment status and deliver links for verified payments automatically.
                  This should be run regularly via cron job for best results.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChannelLinkDeliveryPanel;
